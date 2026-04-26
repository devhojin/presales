/**
 * 4단계 중복 제거 (daily-news.py 포팅).
 *  0. cross-day dedup: 최근 N일 아카이브 url_hash + title 시드
 *  1. Google News article ID / 정규화 제목 정확 매칭
 *  2. Jaccard 유사도 매칭 (같은 사건 다른 매체 재보도)
 *  3. AI semantic dedup 은 dedup-claude.ts 에서 별도
 */
import { createHash } from 'node:crypto'

export interface NewsItem {
  title: string
  link: string
  date?: string
  source?: string
}

export function urlHash(url: string): string {
  return createHash('sha256').update(url, 'utf8').digest('hex').slice(0, 16)
}

export function normalizeTitle(title: string): string {
  let t = title || ''
  // "- 매체명" 끝부분 제거
  t = t.replace(/\s*[-–—]\s*[^-–—]+$/u, '')
  // 따옴표 제거
  t = t.replace(/["'‘’“”]/gu, '')
  // 특수문자 → 공백
  t = t.replace(/[\.,!?·…()\[\]【】「」『』:;]/gu, ' ')
  // 연속 공백 → 1개
  t = t.replace(/\s+/gu, ' ').trim().toLowerCase()
  return t
}

export function titleSignature(title: string): Set<string> {
  const norm = normalizeTitle(title)
  return new Set(norm.split(' ').filter((w) => w.length >= 2))
}

export function areSimilarTitles(a: Set<string>, b: Set<string>): boolean {
  if (!a.size || !b.size) return false
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  const union = a.size + b.size - inter
  if (union === 0) return false
  const jaccard = inter / union
  const shorter = Math.min(a.size, b.size)
  const containment = shorter ? inter / shorter : 0
  return jaccard >= 0.55 || containment >= 0.8
}

export function dedupKey(item: NewsItem): string {
  const link = item.link || ''
  if (link.includes('/articles/')) {
    try {
      const aid = link.split('/articles/')[1].split('?')[0]
      return `gn:${aid}`
    } catch {
      // fallthrough
    }
  }
  return `t:${(item.title || '').trim()}`
}

export interface DedupSeed {
  exact: Set<string>
  signatures: Set<string>[]
}

export function buildSeed(recentTitles: string[]): DedupSeed {
  const exact = new Set<string>()
  const signatures: Set<string>[] = []
  for (const t of recentTitles) {
    exact.add(`nt:${normalizeTitle(t)}`)
    const sig = titleSignature(t)
    if (sig.size > 0) signatures.push(sig)
  }
  return { exact, signatures }
}

export interface FilterResult {
  kept: NewsItem[]
  removed: number
}

/**
 * 키워드 fetch 결과를 받아서 4단계 중 1, 2단계 dedup 적용.
 * 이미 본 것 / 유사한 것 제외하고 새로운 것만 반환.
 */
export function filterAgainstSeed(
  fetched: NewsItem[],
  seed: DedupSeed,
  keepExisting: { exact: Set<string>; signatures: Set<string>[] },
  limit: number,
): NewsItem[] {
  const kept: NewsItem[] = []
  for (const it of fetched) {
    const exactKey = dedupKey(it)
    const titleKey = `nt:${normalizeTitle(it.title || '')}`
    if (
      seed.exact.has(exactKey) || seed.exact.has(titleKey) ||
      keepExisting.exact.has(exactKey) || keepExisting.exact.has(titleKey)
    ) continue

    const sig = titleSignature(it.title || '')
    let isDup = false
    for (const prev of seed.signatures) if (areSimilarTitles(sig, prev)) { isDup = true; break }
    if (!isDup) for (const prev of keepExisting.signatures) if (areSimilarTitles(sig, prev)) { isDup = true; break }
    if (isDup) continue

    keepExisting.exact.add(exactKey)
    keepExisting.exact.add(titleKey)
    keepExisting.signatures.push(sig)
    kept.push(it)
    if (kept.length >= limit) break
  }
  return kept
}
