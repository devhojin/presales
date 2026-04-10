/**
 * K-Startup 공공데이터 API 공고 자동 수집 모듈
 * SPC 프로젝트에서 이식 — 프리세일즈 버전
 */

import { createClient } from '@supabase/supabase-js'

// ===========================
// Types
// ===========================

interface KStartupItem {
  pbanc_sn: number
  biz_pbanc_nm: string
  intg_pbanc_biz_nm: string | null
  pbanc_ctnt: string
  supt_biz_clsfc: string
  supt_regin: string
  aply_trgt: string
  aply_trgt_ctnt: string
  biz_trgt_age: string
  biz_enyy: string
  pbanc_rcpt_bgng_dt: string
  pbanc_rcpt_end_dt: string
  pbanc_ntrp_nm: string
  sprv_inst: string
  biz_prch_dprt_nm: string
  prch_cnpl_no: string
  detl_pg_url: string
  rcrt_prgs_yn: string
  intg_pbanc_yn: string
  aply_mthd_onli_rcpt_istc: string | null
  aply_mthd_etc_istc: string | null
  aply_excl_trgt_ctnt: string | null
  biz_gdnc_url: string | null
  biz_aply_url: string | null
}

export interface FetchResult {
  source: string
  fetched: number
  inserted: number
  skipped: number
  blocked: number
  errors: string[]
}

export type ProgressCallback = (msg: { source: string; status: string; fetched: number; inserted: number; skipped: number }) => void

// ===========================
// Normalization
// ===========================

const REGION_NORMALIZE: Record<string, string> = {
  "서울": "서울특별시", "부산": "부산광역시", "대구": "대구광역시",
  "인천": "인천광역시", "광주": "광주광역시", "대전": "대전광역시",
  "울산": "울산광역시", "세종": "세종특별자치시", "경기": "경기도",
  "강원": "강원도", "충북": "충청북도", "충남": "충청남도",
  "전북": "전라북도", "전남": "전라남도", "경북": "경상북도",
  "경남": "경상남도", "제주": "제주특별자치도",
}

function normalizeTargetType(raw: string): string {
  const t = raw.trim()
  return t === "1인 창조기업" ? "1인창조기업" : t
}

function normalizeAgeRange(raw: string): string {
  return raw.trim().replace(/\s*~\s*/g, "~")
}

function normalizeRegion(raw: string): string {
  const t = raw.trim()
  if (t.includes("시") || t.includes("도") || t === "전국") return t
  return REGION_NORMALIZE[t] || t
}

function splitAndNormalize(val: string, fn?: (s: string) => string): string[] {
  if (!val) return []
  return val.split(",").map(s => fn ? fn(s) : s.trim()).filter(Boolean)
}

function formatDate(raw: string): string | null {
  if (!raw || raw.length < 8) return null
  const c = raw.replace(/[^0-9]/g, "")
  if (c.length !== 8) return null
  return `${c.slice(0, 4)}-${c.slice(4, 6)}-${c.slice(6, 8)}`
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ===========================
// Fetch K-Startup Announcements
// ===========================

async function fetchKStartupAnnouncements(onProgress?: ProgressCallback): Promise<FetchResult> {
  const result: FetchResult = { source: "K-Startup", fetched: 0, inserted: 0, skipped: 0, blocked: 0, errors: [] }
  const apiKey = process.env.KSTARTUP_API_KEY

  if (!apiKey) {
    result.errors.push("KSTARTUP_API_KEY 환경변수가 설정되지 않았습니다")
    return result
  }

  const supabase = getServiceClient()

  // 차단 목록
  const blockedSet = new Set<string>()
  const { data: blockedRows } = await supabase
    .from("blocked_announcements")
    .select("external_id")
    .limit(5000)
  if (blockedRows) {
    for (const row of blockedRows) blockedSet.add(row.external_id)
  }

  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    try {
      const url = `https://apis.data.go.kr/B552735/kisedKstartupService01/getAnnouncementInformation01?ServiceKey=${encodeURIComponent(apiKey)}&returnType=json&page=${page}&perPage=${perPage}&Rcrt_prgs_yn=Y`

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        const text = await res.text()
        result.errors.push(`API HTTP ${res.status}: ${text.substring(0, 200)}`)
        break
      }

      const json = await res.json()
      const items: KStartupItem[] = json.data || []
      const totalCount: number = json.totalCount || 0

      result.fetched += items.length

      for (const item of items) {
        const title = item.biz_pbanc_nm || ""
        if (!title) continue

        const externalId = String(item.pbanc_sn)

        if (blockedSet.has(externalId)) {
          result.blocked++
          continue
        }

        const startDate = formatDate(item.pbanc_rcpt_bgng_dt)
        const endDate = formatDate(item.pbanc_rcpt_end_dt)

        const supportAreas = splitAndNormalize(item.supt_biz_clsfc)
        const regions = splitAndNormalize(item.supt_regin, normalizeRegion)
        const targetTypes = splitAndNormalize(item.aply_trgt, normalizeTargetType)
        const ageRanges = splitAndNormalize(item.biz_trgt_age, normalizeAgeRange)
        const businessYears = splitAndNormalize(item.biz_enyy)

        if (supportAreas.length === 0) supportAreas.push("사업화")
        if (regions.length === 0) regions.push("전국")
        if (targetTypes.length === 0) targetTypes.push("일반기업")
        if (ageRanges.length === 0) ageRanges.push("제한없음")
        if (businessYears.length === 0) businessYears.push("제한없음")

        const status = item.rcrt_prgs_yn === "Y" ? "active" : "closed"
        const sourceUrl = item.detl_pg_url || item.biz_gdnc_url || ""

        const dbRow = {
          title,
          organization: item.pbanc_ntrp_nm || item.sprv_inst || "창업진흥원",
          type: "public",
          budget: "",
          start_date: startDate,
          end_date: endDate,
          application_method: item.aply_mthd_onli_rcpt_istc || item.aply_mthd_etc_istc || "K-Startup 홈페이지",
          target: item.aply_trgt_ctnt || item.aply_trgt || "",
          description: (item.pbanc_ctnt || "").substring(0, 2000),
          eligibility: item.aply_trgt_ctnt || "",
          department: item.biz_prch_dprt_nm || "",
          contact: item.prch_cnpl_no || "",
          source_url: sourceUrl,
          field: item.supt_biz_clsfc || "",
          status,
          source: "K-Startup",
          external_id: externalId,
          matching_keywords: supportAreas,
          support_areas: supportAreas,
          regions,
          target_types: targetTypes,
          age_ranges: ageRanges,
          business_years: businessYears,
          governing_body: item.sprv_inst || item.pbanc_ntrp_nm || "",
        }

        // 중복 체크: external_id 또는 제목 기준
        const { data: existById } = await supabase
          .from("announcements")
          .select("id")
          .eq("external_id", externalId)
          .limit(1)

        if (existById && existById.length > 0) {
          result.skipped++
          continue
        }

        // 제목+기관 동일한 공고도 중복으로 간주
        const { data: existByTitle } = await supabase
          .from("announcements")
          .select("id")
          .eq("title", title)
          .eq("organization", dbRow.organization)
          .limit(1)

        if (existByTitle && existByTitle.length > 0) {
          result.skipped++
        } else {
          const { data: inserted, error } = await supabase
            .from("announcements")
            .insert({ ...dbRow, is_published: false })
            .select("id")
            .maybeSingle()
          if (error) {
            result.errors.push(`INSERT [${externalId}]: ${error.message}`)
          } else {
            result.inserted++
            await supabase.from("announcement_logs").insert({
              action: "collected",
              announcement_id: inserted?.id || null,
              announcement_title: dbRow.title,
              source: "K-Startup API",
              detail: `비공개로 자동 수집됨 (${dbRow.organization || ""})`,
            })
          }
        }
      }

      onProgress?.({ source: "K-Startup", status: `페이지 ${page} 수집 완료`, fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })

      if (items.length < perPage || page * perPage >= totalCount) {
        hasMore = false
      } else {
        page++
      }

      if (page > 3) hasMore = false
    } catch (err) {
      result.errors.push(`페이지 ${page} 오류: ${err instanceof Error ? err.message : String(err)}`)
      hasMore = false
    }
  }

  onProgress?.({ source: "K-Startup", status: "완료", fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })
  return result
}

// ===========================
// Fetch 기업마당 (bizinfo.go.kr) — 중소벤처24 공고
// ===========================

interface BizinfoItem {
  pblancId: string
  pblancNm: string       // 공고명
  jrsdInsttNm: string    // 관할기관
  excInsttNm: string     // 수행기관
  bsnsSumryCn: string    // 사업요약 (HTML)
  reqstBeginEndDe: string // 접수기간
  creatPnttm: string     // 등록일
  pblancUrl: string      // 상세 URL
  trgetNm: string        // 지원대상
  pldirSportRealmLclasCodeNm: string // 분야 대분류
  pldirSportRealmMlsfcCodeNm: string // 분야 중분류
  hashtags: string       // 해시태그 (쉼표 구분)
  refrncNm: string       // 문의처
  reqstMthPapersCn: string // 접수방법
  totCnt: number
}

async function fetchBizinfoAnnouncements(onProgress?: ProgressCallback): Promise<FetchResult> {
  const result: FetchResult = { source: "중소벤처24", fetched: 0, inserted: 0, skipped: 0, blocked: 0, errors: [] }
  const apiKey = process.env.BIZINFO_API_KEY

  if (!apiKey) {
    result.errors.push("BIZINFO_API_KEY 미설정 — 기업마당 수집 건너뜀")
    return result
  }

  const supabase = getServiceClient()

  // 차단 목록
  const blockedSet = new Set<string>()
  const { data: blockedRows } = await supabase
    .from("blocked_announcements")
    .select("external_id")
    .limit(5000)
  if (blockedRows) {
    for (const row of blockedRows) blockedSet.add(row.external_id)
  }

  try {
    // 최대 3페이지 수집 (각 50건)
    for (let pageIndex = 1; pageIndex <= 3; pageIndex++) {
      const url = `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do?crtfcKey=${encodeURIComponent(apiKey)}&dataType=json&pageUnit=50&pageIndex=${pageIndex}`

      const res = await fetch(url, { cache: "no-store" })
      if (!res.ok) {
        result.errors.push(`기업마당 API HTTP ${res.status}`)
        break
      }

      const json = await res.json()

      // 에러 응답 처리
      if (json.reqErr) {
        result.errors.push(`기업마당 API 오류: ${json.reqErr}`)
        break
      }

      const items: BizinfoItem[] = json.jsonArray || json.items || []
      if (items.length === 0) break

      result.fetched += items.length

      for (const item of items) {
        const title = (item.pblancNm || "").trim()
        if (!title) continue

        const externalId = `bizinfo-${item.pblancId}`

        if (blockedSet.has(externalId)) {
          result.blocked++
          continue
        }

        // 접수기간 파싱 — "2026-04-01 ~ 2026-05-31" 또는 "예산 소진시까지"
        let startDate: string | null = null
        let endDate: string | null = null
        if (item.reqstBeginEndDe && item.reqstBeginEndDe.includes("~")) {
          const parts = item.reqstBeginEndDe.split("~").map(s => s.trim())
          if (parts[0] && /^\d{4}-\d{2}-\d{2}/.test(parts[0])) startDate = parts[0].slice(0, 10)
          if (parts[1] && /^\d{4}-\d{2}-\d{2}/.test(parts[1])) endDate = parts[1].slice(0, 10)
        }

        // 분야 매핑
        const supportAreas: string[] = []
        if (item.pldirSportRealmLclasCodeNm) supportAreas.push(item.pldirSportRealmLclasCodeNm)
        if (item.pldirSportRealmMlsfcCodeNm) supportAreas.push(item.pldirSportRealmMlsfcCodeNm)
        if (supportAreas.length === 0) supportAreas.push("지원사업")

        // 해시태그에서 지역 추출
        const regions: string[] = ["전국"]
        if (item.hashtags) {
          const tags = item.hashtags.split(",").map(t => t.trim())
          for (const tag of tags) {
            if (Object.keys(REGION_NORMALIZE).includes(tag) || tag.includes("시") || tag.includes("도")) {
              regions[0] = normalizeRegion(tag)
              break
            }
          }
        }

        // HTML 제거한 설명
        const descriptionClean = (item.bsnsSumryCn || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().substring(0, 2000)

        const status = endDate && new Date(endDate) < new Date() ? "closed" : "active"

        const dbRow = {
          title,
          organization: item.jrsdInsttNm || item.excInsttNm || "중소벤처기업부",
          type: "public",
          budget: "",
          start_date: startDate,
          end_date: endDate,
          application_method: item.reqstMthPapersCn || "기업마당 홈페이지",
          target: item.trgetNm || "",
          description: descriptionClean,
          eligibility: item.trgetNm || "",
          department: item.excInsttNm || item.jrsdInsttNm || "",
          contact: item.refrncNm || "",
          source_url: item.pblancUrl || `https://www.bizinfo.go.kr/sii/siia/selectSIIA200Detail.do?pblancId=${item.pblancId}`,
          field: item.pldirSportRealmLclasCodeNm || "",
          status,
          source: "중소벤처24",
          external_id: externalId,
          matching_keywords: supportAreas,
          support_areas: supportAreas,
          regions,
          target_types: item.trgetNm ? [item.trgetNm] : ["중소기업"],
          age_ranges: ["제한없음"],
          business_years: ["제한없음"],
          governing_body: item.jrsdInsttNm || "",
        }

        // 중복 체크
        const { data: existById } = await supabase
          .from("announcements")
          .select("id")
          .eq("external_id", externalId)
          .limit(1)

        if (existById && existById.length > 0) {
          result.skipped++
          continue
        }

        const { data: existByTitle } = await supabase
          .from("announcements")
          .select("id")
          .eq("title", title)
          .eq("organization", dbRow.organization)
          .limit(1)

        if (existByTitle && existByTitle.length > 0) {
          result.skipped++
        } else {
          const { data: inserted, error } = await supabase
            .from("announcements")
            .insert({ ...dbRow, is_published: false })
            .select("id")
            .maybeSingle()
          if (error) {
            result.errors.push(`INSERT [${externalId}]: ${error.message}`)
          } else {
            result.inserted++
            await supabase.from("announcement_logs").insert({
              action: "collected",
              announcement_id: inserted?.id || null,
              announcement_title: dbRow.title,
              source: "기업마당 API",
              detail: `비공개로 자동 수집됨 (${dbRow.organization || ""})`,
            })
          }
        }
      }

      onProgress?.({ source: "중소벤처24", status: `페이지 ${pageIndex} 수집 완료`, fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })

      const totCnt = json.totCnt || json.totalCount || 0
      if (pageIndex * 50 >= totCnt || items.length < 50) break
    }
  } catch (err) {
    result.errors.push(`기업마당 수집 오류: ${err instanceof Error ? err.message : String(err)}`)
  }

  onProgress?.({ source: "중소벤처24", status: "완료", fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })
  return result
}

// ===========================
// Fetch NIPA (정보통신산업진흥원) — HTML Scraping
// ===========================

interface NipaSource {
  name: string
  url: string
  category: string
  pages: number
}

const NIPA_SOURCES: NipaSource[] = [
  { name: "NIPA 사업공고", url: "https://www.nipa.kr/home/2-2?tab=1", category: "사업공고", pages: 2 },
  { name: "NIPA 입찰공고", url: "https://www.nipa.kr/home/2-3", category: "입찰공고", pages: 2 },
]

async function fetchNipaAnnouncements(onProgress?: ProgressCallback): Promise<FetchResult[]> {
  const results: FetchResult[] = []
  const supabase = getServiceClient()

  // 차단 목록
  const blockedSet = new Set<string>()
  const { data: blockedRows } = await supabase.from("blocked_announcements").select("external_id").limit(5000)
  if (blockedRows) for (const row of blockedRows) blockedSet.add(row.external_id)

  for (const source of NIPA_SOURCES) {
    const result: FetchResult = { source: source.name, fetched: 0, inserted: 0, skipped: 0, blocked: 0, errors: [] }
    onProgress?.({ source: source.name, status: "수집 시작...", fetched: 0, inserted: 0, skipped: 0 })

    try {
      for (let page = 1; page <= source.pages; page++) {
        const pageUrl = `${source.url}${source.url.includes('?') ? '&' : '?'}curPage=${page}`
        const res = await fetch(pageUrl, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0 PRESALES Bot" } })
        if (!res.ok) { result.errors.push(`NIPA HTTP ${res.status}`); break }

        const html = await res.text()

        // Parse table rows: extract links with /home/2-{n}/{id} pattern
        const rowRegex = /<tr[^>]*>[\s\S]*?<\/tr>/gi
        const rows = html.match(rowRegex) || []

        for (const row of rows) {
          // Extract link and title
          const linkMatch = row.match(/href="\/home\/2-\d+\/(\d+)"/)
          if (!linkMatch) continue
          const postId = linkMatch[1]
          const externalId = `nipa-${postId}`

          // Title from <a> tag
          const titleMatch = row.match(/href="\/home\/2-\d+\/\d+"[^>]*>([^<]+)</)
          const title = titleMatch ? titleMatch[1].trim() : ""
          if (!title) continue

          result.fetched++

          if (blockedSet.has(externalId)) { result.blocked++; continue }

          // Period parsing: "YYYY.MM.DD ~ YYYY.MM.DD"
          let startDate: string | null = null
          let endDate: string | null = null
          const periodMatch = row.match(/(\d{4}\.\d{2}\.\d{2})\s*~\s*(\d{4}\.\d{2}\.\d{2})/)
          if (periodMatch) {
            startDate = periodMatch[1].replace(/\./g, "-")
            endDate = periodMatch[2].replace(/\./g, "-")
          }

          // D-day
          const ddayMatch = row.match(/D-(\d+)/)
          const dday = ddayMatch ? parseInt(ddayMatch[1]) : -1
          const status = dday >= 0 ? "active" : endDate && new Date(endDate) >= new Date() ? "active" : "closed"

          const detailUrl = `https://www.nipa.kr/home/2-${source.url.includes('2-2') ? '2' : '3'}/${postId}`

          const dbRow = {
            title,
            organization: "NIPA(정보통신산업진흥원)",
            type: "public",
            budget: "",
            start_date: startDate,
            end_date: endDate,
            application_method: "NIPA 홈페이지",
            target: "",
            description: "",
            eligibility: "",
            department: "NIPA",
            contact: "",
            source_url: detailUrl,
            field: source.category,
            status,
            source: source.name,
            external_id: externalId,
            matching_keywords: [source.category],
            support_areas: [source.category],
            regions: ["전국"],
            target_types: ["중소기업"],
            age_ranges: ["제한없음"],
            business_years: ["제한없음"],
            governing_body: "과학기술정보통신부",
          }

          // 중복 체크
          const { data: existById } = await supabase.from("announcements").select("id").eq("external_id", externalId).limit(1)
          if (existById && existById.length > 0) { result.skipped++; continue }

          const { data: inserted, error } = await supabase.from("announcements").insert({ ...dbRow, is_published: false }).select("id").maybeSingle()
          if (error) { result.errors.push(`NIPA INSERT: ${error.message}`) }
          else {
            result.inserted++
            await supabase.from("announcement_logs").insert({ action: "collected", announcement_id: inserted?.id || null, announcement_title: title, source: source.name, detail: "비공개로 자동 수집됨" })
          }
        }

        onProgress?.({ source: source.name, status: `페이지 ${page} 완료`, fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })
      }
    } catch (err) {
      result.errors.push(`${source.name} 오류: ${err instanceof Error ? err.message : String(err)}`)
    }

    onProgress?.({ source: source.name, status: "완료", fetched: result.fetched, inserted: result.inserted, skipped: result.skipped })
    results.push(result)
  }

  return results
}

// ===========================
// Main Export
// ===========================

export async function fetchAllAnnouncements(onProgress?: ProgressCallback): Promise<{ results: FetchResult[]; totalInserted: number; totalSkipped: number; totalBlocked: number }> {
  const results: FetchResult[] = []

  // 1. K-Startup
  onProgress?.({ source: "K-Startup", status: "수집 시작...", fetched: 0, inserted: 0, skipped: 0 })
  const kstartup = await fetchKStartupAnnouncements(onProgress)
  results.push(kstartup)

  // 2. 기업마당(중소벤처24)
  onProgress?.({ source: "중소벤처24", status: "수집 시작...", fetched: 0, inserted: 0, skipped: 0 })
  const bizinfo = await fetchBizinfoAnnouncements(onProgress)
  results.push(bizinfo)

  // 3. NIPA (사업공고 + 입찰공고)
  const nipaResults = await fetchNipaAnnouncements(onProgress)
  results.push(...nipaResults)

  const totalInserted = results.reduce((s, r) => s + r.inserted, 0)
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0)
  const totalBlocked = results.reduce((s, r) => s + r.blocked, 0)

  return { results, totalInserted, totalSkipped, totalBlocked }
}
