import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

type PageViewRow = Pick<
  Database['public']['Tables']['page_views']['Row'],
  'created_at' | 'session_id' | 'path' | 'referrer'
>
type OrderRow = Pick<
  Database['public']['Tables']['orders']['Row'],
  'created_at' | 'status' | 'total_amount'
>
type CreatedAtRow = { created_at: string | null }
type SignupRow = { name: string | null; email: string | null; created_at: string | null }

export interface AdminAnalyticsDayStat {
  date: string
  pageViews: number
  visitors: number
  orders: number
  revenue: number
  signups: number
  consulting: number
  reviews: number
  storeViews: number
  cartViews: number
  checkoutViews: number
}

export interface AdminAnalyticsFunnel {
  visitors: number
  storeViews: number
  cartViews: number
  checkoutViews: number
  orders: number
  completed: number
}

export interface AdminAnalyticsSummary {
  periodDays: number
  dailyStats: AdminAnalyticsDayStat[]
  monthlyData: Record<string, Record<number, { pv: number; uv: number }>>
  funnelData: AdminAnalyticsFunnel
  referrers: { referrer: string; count: number }[]
  totalRefs: number
  topPages: { path: string; count: number }[]
  keywords: { keyword: string; count: number }[]
  recentSignups: { name: string | null; email: string | null; created_at: string }[]
}

const ANALYTICS_ROW_LIMIT = 100_000
const COMPLETED_ORDER_STATUSES = new Set(['paid', 'completed'])
const VOID_ORDER_STATUSES = new Set(['cancelled', 'canceled', 'refunded'])

function toKstYmd(date: Date): string {
  const kst = new Date(date.getTime() + 9 * 3600 * 1000)
  return kst.toISOString().slice(0, 10)
}

function addDaysToYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function kstDayStartUtcIso(ymd: string): string {
  return new Date(`${ymd}T00:00:00.000+09:00`).toISOString()
}

function kstDateKey(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return toKstYmd(date)
}

function sessionKey(row: Pick<PageViewRow, 'session_id' | 'created_at' | 'path'>, index: number): string {
  return row.session_id || `anonymous-${index}-${row.created_at || ''}-${row.path || ''}`
}

function normalizeStatus(status: string | null): string {
  return (status || '').toLowerCase()
}

function isStorePath(path: string | null): boolean {
  return path === '/store' || path?.startsWith('/store/') === true
}

function isCartPath(path: string | null): boolean {
  return path === '/cart' || path?.startsWith('/cart/') === true
}

function isCheckoutPath(path: string | null): boolean {
  return path === '/checkout' || path?.startsWith('/checkout/') === true
}

function extractSearchKeyword(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    const params = ['q', 'query', 'wd', 'p']
    for (const key of params) {
      const value = url.searchParams.get(key)
      if (value?.trim()) return value.trim()
    }
    if (host.includes('google') || host.includes('naver') || host.includes('daum') || host.includes('bing')) {
      return null
    }
    return null
  } catch {
    return null
  }
}

function normalizeReferrer(raw: string | null | undefined): string {
  if (!raw || raw.trim() === '' || raw === 'direct') return '직접 유입'
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    if (host.includes('google')) return 'Google'
    if (host.includes('naver')) return 'Naver'
    if (host.includes('daum') || host.includes('kakao')) return 'Kakao/Daum'
    if (host.includes('facebook') || host.includes('fb.com')) return 'Facebook'
    if (host.includes('instagram')) return 'Instagram'
    if (host.includes('twitter') || host.includes('t.co')) return 'Twitter/X'
    if (host.includes('youtube')) return 'YouTube'
    if (host.includes('linkedin')) return 'LinkedIn'
    return host
  } catch {
    return raw.length > 40 ? `${raw.slice(0, 40)}...` : raw
  }
}

function increment(map: Record<string, number>, key: string, amount = 1) {
  map[key] = (map[key] || 0) + amount
}

export async function getAdminAnalyticsSummary(
  service: SupabaseClient<Database>,
  periodDays: number
): Promise<AdminAnalyticsSummary> {
  const days = [7, 30, 90].includes(periodDays) ? periodDays : 7
  const todayKey = toKstYmd(new Date())
  const startKey = addDaysToYmd(todayKey, -(days - 1))
  const endKey = addDaysToYmd(todayKey, 1)
  const rangeStart = kstDayStartUtcIso(startKey)
  const rangeEnd = kstDayStartUtcIso(endKey)

  const [
    pageViewsResult,
    ordersResult,
    profilesResult,
    consultingResult,
    reviewsResult,
    recentSignupsResult,
    allPageViewsResult,
  ] = await Promise.all([
    service
      .from('page_views')
      .select('created_at, session_id, path, referrer')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .range(0, ANALYTICS_ROW_LIMIT - 1),
    service
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .range(0, ANALYTICS_ROW_LIMIT - 1),
    service
      .from('profiles')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .range(0, ANALYTICS_ROW_LIMIT - 1),
    service
      .from('consulting_requests')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .range(0, ANALYTICS_ROW_LIMIT - 1),
    service
      .from('reviews')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)
      .range(0, ANALYTICS_ROW_LIMIT - 1),
    service
      .from('profiles')
      .select('name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    service
      .from('page_views')
      .select('created_at, session_id')
      .order('created_at', { ascending: true })
      .range(0, ANALYTICS_ROW_LIMIT - 1),
  ])

  const errors = [
    pageViewsResult.error,
    ordersResult.error,
    profilesResult.error,
    consultingResult.error,
    reviewsResult.error,
    recentSignupsResult.error,
    allPageViewsResult.error,
  ].filter(Boolean)

  if (errors.length > 0) {
    throw new Error(errors.map((error) => error?.message).join(' / '))
  }

  const pageViews = (pageViewsResult.data || []) as PageViewRow[]
  const orders = (ordersResult.data || []) as OrderRow[]
  const profiles = (profilesResult.data || []) as CreatedAtRow[]
  const consulting = (consultingResult.data || []) as CreatedAtRow[]
  const reviews = (reviewsResult.data || []) as CreatedAtRow[]
  const allPageViews = (allPageViewsResult.data || []) as Pick<PageViewRow, 'created_at' | 'session_id'>[]

  const dailyStats: AdminAnalyticsDayStat[] = []
  for (let i = 0; i < days; i += 1) {
    const date = addDaysToYmd(startKey, i)
    const dayPageViews = pageViews.filter((row) => kstDateKey(row.created_at) === date)
    const daySessions = new Set(dayPageViews.map((row, index) => sessionKey(row, index)))
    const dayOrders = orders.filter((row) => {
      const status = normalizeStatus(row.status)
      return kstDateKey(row.created_at) === date && COMPLETED_ORDER_STATUSES.has(status)
    })

    dailyStats.push({
      date,
      pageViews: dayPageViews.length,
      visitors: daySessions.size,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((sum, row) => sum + Number(row.total_amount || 0), 0),
      signups: profiles.filter((row) => kstDateKey(row.created_at) === date).length,
      consulting: consulting.filter((row) => kstDateKey(row.created_at) === date).length,
      reviews: reviews.filter((row) => kstDateKey(row.created_at) === date).length,
      storeViews: new Set(dayPageViews.filter((row) => isStorePath(row.path)).map((row, index) => sessionKey(row, index))).size,
      cartViews: new Set(dayPageViews.filter((row) => isCartPath(row.path)).map((row, index) => sessionKey(row, index))).size,
      checkoutViews: new Set(dayPageViews.filter((row) => isCheckoutPath(row.path)).map((row, index) => sessionKey(row, index))).size,
    })
  }

  const allSessions = new Set(pageViews.map((row, index) => sessionKey(row, index)))
  const storeSessions = new Set(pageViews.filter((row) => isStorePath(row.path)).map((row, index) => sessionKey(row, index)))
  const cartSessions = new Set(pageViews.filter((row) => isCartPath(row.path)).map((row, index) => sessionKey(row, index)))
  const checkoutSessions = new Set(pageViews.filter((row) => isCheckoutPath(row.path)).map((row, index) => sessionKey(row, index)))
  const activeOrders = orders.filter((row) => !VOID_ORDER_STATUSES.has(normalizeStatus(row.status)))
  const completedOrders = orders.filter((row) => COMPLETED_ORDER_STATUSES.has(normalizeStatus(row.status)))

  const refMap: Record<string, number> = {}
  const pathMap: Record<string, number> = {}
  const keywordMap: Record<string, number> = {}
  for (const row of pageViews) {
    increment(refMap, normalizeReferrer(row.referrer))
    if (row.path) increment(pathMap, row.path)

    const keyword = extractSearchKeyword(row.referrer)
    if (keyword) increment(keywordMap, keyword)
  }

  const monthlyData: Record<string, Record<number, { pv: number; uv: number }>> = {}
  const sessionsByMonth: Record<string, Record<number, Set<string>>> = {}
  for (const [index, row] of allPageViews.entries()) {
    const dateKey = kstDateKey(row.created_at)
    if (!dateKey) continue
    const year = dateKey.slice(0, 4)
    const month = Number(dateKey.slice(5, 7))

    monthlyData[year] ||= {}
    monthlyData[year][month] ||= { pv: 0, uv: 0 }
    monthlyData[year][month].pv += 1

    sessionsByMonth[year] ||= {}
    sessionsByMonth[year][month] ||= new Set<string>()
    sessionsByMonth[year][month].add(row.session_id || `anonymous-month-${index}-${row.created_at || ''}`)
  }

  for (const [year, months] of Object.entries(sessionsByMonth)) {
    for (const [month, sessions] of Object.entries(months)) {
      monthlyData[year] ||= {}
      monthlyData[year][Number(month)] ||= { pv: 0, uv: 0 }
      monthlyData[year][Number(month)].uv = sessions.size
    }
  }

  const recentSignups = ((recentSignupsResult.data || []) as SignupRow[])
    .filter((row): row is { name: string | null; email: string | null; created_at: string } => Boolean(row.created_at))

  return {
    periodDays: days,
    dailyStats,
    monthlyData,
    funnelData: {
      visitors: allSessions.size,
      storeViews: storeSessions.size,
      cartViews: cartSessions.size,
      checkoutViews: checkoutSessions.size,
      orders: activeOrders.length,
      completed: completedOrders.length,
    },
    referrers: Object.entries(refMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count })),
    totalRefs: pageViews.length,
    topPages: Object.entries(pathMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count })),
    keywords: Object.entries(keywordMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count })),
    recentSignups,
  }
}
