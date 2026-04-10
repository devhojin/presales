/**
 * IT피드 커뮤니티 게시글 외부 수집 모듈
 * SPC fetch-community-posts.ts 이식 — 프리세일즈 버전
 * - FEED_SOURCES에 등록된 RSS 소스를 순회하며 수집
 * - 수집 → 비공개(is_published=false) → 관리자 검토 → 공개
 */

import { createClient } from '@supabase/supabase-js'
import { FEED_SOURCES } from '@/lib/feed-sources'

// ===========================
// Types
// ===========================

export interface FetchResult {
  source: string
  source_name: string
  total_fetched: number
  new_inserted: number
  already_exists: number
  blocked_skipped: number
  status: 'success' | 'error'
  errors: string[]
}

interface RssItem {
  title?: string
  link?: string
  description?: string
  pubDate?: string
  category?: string | string[]
  'dc:creator'?: string
  guid?: string | { '#text'?: string }
}

// ===========================
// HTML 태그 제거 유틸
// ===========================

function stripHtml(html: string): string {
  return html
    // Remove script/style/iframe tags entirely
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    // CDATA markers
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    // Block tags → paragraph breaks
    .replace(/<\/?(p|div|br|h[1-6]|li|tr|blockquote)[^>]*>/gi, '\n')
    // Remove remaining HTML tags
    .replace(/<[^>]*>/g, '')
    // HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    // RSS tail cleanup
    .replace(/The post .* appeared first on .*$/i, '')
    // Collapse excessive whitespace but keep paragraph breaks
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** link URL에서 고유 ID 생성 (external_id용) */
function urlToExternalId(url: string): string {
  if (!url) return `no-url-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  // URL에서 숫자 ID 추출 시도 (article/12345, ?p=12345 등)
  const idMatch = url.match(/(?:\/|[?&](?:p|id|no|sn)=)(\d{4,})/)
  if (idMatch) return idMatch[1]
  // URL 끝의 숫자 segment
  const segments = url.replace(/\/+$/, '').split('/')
  const last = segments[segments.length - 1] || ''
  if (/^\d+$/.test(last) && last.length >= 4) return last
  // 전체 URL 해시 (쿼리스트링 포함)
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

// ===========================
// 카테고리 자동 분류 (제목 키워드 기반)
// ===========================

function classifyCategoryByTitle(title: string): string {
  const t = title.toLowerCase()

  // 입찰공고: 입찰, 조달, 수주
  if (/입찰|조달|수주|발주|용역|구매/.test(t)) return 'bid'

  // 과제공고: 과제, R&D, 공모, 연구
  if (/과제|r&d|공모|연구|기술개발|사업공고|모집/.test(t)) return 'task'

  // 행사안내: 설명회, 컨퍼런스, 데모데이, 상담회
  if (/설명회|컨퍼런스|데모데이|상담회|세미나|워크숍|포럼|행사|박람회|전시/.test(t))
    return 'event'

  // 정책소식: 정책, 규제, 법률, 시행, 고시
  if (/정책|규제|법률|시행|고시|지침|가이드|제도|법안/.test(t)) return 'policy'

  // 그 외 → IT뉴스
  return 'news'
}

// ===========================
// Helper: Service Client
// ===========================

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ===========================
// RSS 수집 로직
// ===========================

async function fetchRssSource(
  source: (typeof FEED_SOURCES)[0]
): Promise<FetchResult> {
  const result: FetchResult = {
    source: source.id,
    source_name: source.name,
    total_fetched: 0,
    new_inserted: 0,
    already_exists: 0,
    blocked_skipped: 0,
    status: 'success',
    errors: [],
  }

  const supabase = getServiceClient()

  // 차단 목록 조회 (최근 차단만 로드)
  const blockedSet = new Set<string>()
  const { data: blockedRows } = await supabase
    .from('blocked_community_posts')
    .select('external_id')
    .eq('source', source.id)
    .limit(2000)
  if (blockedRows) {
    for (const row of blockedRows) blockedSet.add(row.external_id)
  }

  try {
    // RSS 피드 가져오기
    const res = await fetch(source.url, {
      cache: 'no-store',
      headers: { 'User-Agent': 'Presales/1.0' },
    })

    if (!res.ok) {
      result.status = 'error'
      const text = await res.text()
      result.errors.push(
        `RSS HTTP ${res.status}: ${text.substring(0, 200)}`
      )
      return result
    }

    const xml = await res.text()

    // 간단한 XML 파싱 (fast-xml-parser 없이)
    // RSS 2.0 구조: <rss><channel><item>
    // Atom 구조: <feed><entry>

    const isAtom = /<feed[\s>]/.test(xml)
    const itemPattern = isAtom ? /<entry[^>]*>[\s\S]*?<\/entry>/g : /<item[^>]*>[\s\S]*?<\/item>/g
    const items = xml.match(itemPattern) || []

    result.total_fetched = items.length

    // 각 아이템 처리
    for (const itemXml of items) {
      const title = extractXmlField(itemXml, 'title').trim()
      let link = extractXmlField(itemXml, 'link')

      // Atom의 경우 href 속성에서 추출
      if (isAtom && !link) {
        const linkMatch = itemXml.match(/link[^>]*href="([^"]+)"/)
        link = linkMatch ? linkMatch[1] : ''
      }

      const description = extractXmlField(
        itemXml,
        isAtom ? 'summary' : 'description'
      )
      const pubDate = extractXmlField(
        itemXml,
        isAtom ? 'updated' : 'pubDate'
      )
      const guid = extractXmlField(itemXml, 'id') || extractXmlField(itemXml, 'guid')

      if (!title || !link) continue

      // Google Alerts의 link에서 실제 URL 추출
      const googleUrlMatch = link.match(/url=([^&]+)/)
      const actualLink = googleUrlMatch ? decodeURIComponent(googleUrlMatch[1]) : link

      const externalId = guid || urlToExternalId(actualLink.trim())

      // 차단 목록 체크
      if (blockedSet.has(externalId)) {
        result.blocked_skipped++
        continue
      }

      // 중복 체크
      const { data: existing } = await supabase
        .from('community_posts')
        .select('id')
        .eq('source', source.id)
        .eq('external_id', externalId)
        .limit(1)

      if (existing && existing.length > 0) {
        result.already_exists++
        continue
      }

      const pubDateISO = pubDate
        ? new Date(pubDate).toISOString()
        : new Date().toISOString()
      const content = stripHtml(description).substring(0, 5000)
      const autoCategory = classifyCategoryByTitle(title)

      const dbRow = {
        category: autoCategory,
        title: stripHtml(title),
        author_name: source.name,
        author_role: '',
        author_avatar: source.emoji || '📰',
        content,
        status: 'published',
        views: 0,
        likes: 0,
        source: source.id,
        source_name: source.name,
        external_id: externalId,
        external_url: actualLink.trim(),
        is_published: false,
        created_at: pubDateISO,
      }

      const { data: inserted, error } = await supabase
        .from('community_posts')
        .insert(dbRow)
        .select('id')
        .maybeSingle()

      if (error) {
        result.errors.push(`INSERT [${externalId}]: ${error.message}`)
      } else {
        result.new_inserted++
        // feed_logs에 수집 기록
        await supabase.from('feed_logs').insert({
          action: 'collected',
          post_id: inserted?.id || null,
          post_title: title,
          source_name: source.name,
          detail: `비공개로 자동 수집됨 (${source.id})`,
        })
      }
    }
  } catch (err) {
    result.status = 'error'
    result.errors.push(
      `RSS 수집 오류: ${err instanceof Error ? err.message : String(err)}`
    )
  }

  return result
}

// ===========================
// XML 필드 추출 헬퍼
// ===========================

function extractXmlField(xml: string, fieldName: string): string {
  const regex = new RegExp(`<${fieldName}[^>]*>([\\s\\S]*?)</${fieldName}>`)
  const match = xml.match(regex)
  if (!match) return ''
  let value = match[1]
  // CDATA 처리
  const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/)
  if (cdataMatch) return cdataMatch[1]
  return value
}

// ===========================
// Main Fetch Function
// ===========================

export type FeedProgressCallback = (msg: { source: string; status: string; fetched: number; inserted: number; skipped: number }) => void

export async function fetchAllCommunityPosts(onProgress?: FeedProgressCallback): Promise<{
  results: FetchResult[]
  totalInserted: number
  totalSkipped: number
  totalBlocked: number
  message: string
}> {
  const sources = FEED_SOURCES.filter(s => s.category) // 활성화된 소스

  if (sources.length === 0) {
    return {
      results: [],
      totalInserted: 0,
      totalSkipped: 0,
      totalBlocked: 0,
      message: '활성화된 수집 소스가 없습니다',
    }
  }

  const results: FetchResult[] = []
  for (let i = 0; i < sources.length; i++) {
    const source = sources[i]
    onProgress?.({ source: source.name, status: `수집 중... (${i + 1}/${sources.length})`, fetched: 0, inserted: 0, skipped: 0 })
    const result = await fetchRssSource(source)
    results.push(result)
    onProgress?.({ source: source.name, status: `완료`, fetched: result.total_fetched, inserted: result.new_inserted, skipped: result.already_exists })
  }

  const totalInserted = results.reduce((s, r) => s + r.new_inserted, 0)
  const totalSkipped = results.reduce((s, r) => s + r.already_exists, 0)
  const totalBlocked = results.reduce((s, r) => s + r.blocked_skipped, 0)

  // 메시지 생성
  const messageParts = results
    .filter(r => r.status === 'success')
    .map(r => {
      if (r.new_inserted > 0) return `${r.source_name} ${r.new_inserted}건 신규`
      return `${r.source_name} 신규 없음`
    })

  const message =
    totalInserted > 0
      ? `수집 완료: ${messageParts.join(', ')} (중복 ${totalSkipped}건${totalBlocked > 0 ? `, 차단 ${totalBlocked}건` : ''} 제외)`
      : `신규 게시글 없음 (중복 ${totalSkipped}건${totalBlocked > 0 ? `, 차단 ${totalBlocked}건` : ''} 제외)`

  return { results, totalInserted, totalSkipped, totalBlocked, message }
}
