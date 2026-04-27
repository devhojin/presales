'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

// ── helpers ──────────────────────────────────────────────────────────
function fmt(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}-${dd}`
}
function isoDate(d: Date) {
  // KST(UTC+9) 기준 YYYY-MM-DD. toISOString()은 UTC라 KST 자정이 전날로 밀림.
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  return kst.toISOString().slice(0, 10)
}
function kstDateKey(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return isoDate(d)
}
function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}
function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

interface DayStat {
  date: string
  pageViews: number
  visitors: number
  orders: number
  revenue: number
  signups: number
  consulting: number
  reviews: number
}

interface ReferrerStat {
  referrer: string
  count: number
}

// ── Referrer normalizer ───────────────────────────────────────────────
function extractSearchKeyword(raw: string | null | undefined): string | null {
  if (!raw) return null
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')
    // 구글·네이버·다음·빙
    const params = ['q', 'query', 'wd', 'p']
    for (const key of params) {
      const v = url.searchParams.get(key)
      if (v && v.trim()) return v.trim()
    }
    // naver의 경우 query 파라미터가 있는 경우만
    if (host.includes('google') || host.includes('naver') || host.includes('daum') || host.includes('bing')) {
      return null
    }
    return null
  } catch {
    return null
  }
}

function pathLabel(p: string): string {
  if (!p || p === '/') return '홈'
  if (p === '/store') return '스토어'
  if (p.startsWith('/store/')) return `상품 상세`
  if (p === '/announcements') return '공고 목록'
  if (p.startsWith('/announcements/')) return '공고 상세'
  if (p === '/feeds') return '피드'
  if (p === '/brief') return '데일리 브리프'
  if (p.startsWith('/brief/')) return '브리프 상세'
  if (p === '/consulting') return '컨설팅'
  if (p === '/about') return '회사소개'
  if (p === '/us') return 'Us'
  if (p === '/faq') return 'FAQ'
  if (p === '/mypage') return '마이페이지'
  if (p === '/auth/login') return '로그인'
  if (p === '/auth/signup') return '회원가입'
  return p
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
    return raw.length > 40 ? raw.slice(0, 40) + '…' : raw
  }
}

// ── SVG line chart (shared) ───────────────────────────────────────────

interface LineChartSeries {
  points: { x: number; y: number }[]
  stroke: string
  fill?: string
  strokeWidth?: number
}

function LineChart({
  series,
  xLabels,
  yMax,
  height = 180,
  seriesLabels,
  valueFormatter,
}: {
  series: LineChartSeries[]
  xLabels: string[]
  yMax: number
  height?: number
  seriesLabels?: string[]
  valueFormatter?: (v: number) => string
}) {
  const W = 700
  const H = height
  const PAD_X = 50
  const PAD_Y = 16
  const BOTTOM = 24
  const plotW = W - PAD_X * 2
  const plotH = H - PAD_Y - BOTTOM
  const lastIdx = Math.max(xLabels.length - 1, 1)

  function toX(i: number) {
    return PAD_X + (i / lastIdx) * plotW
  }
  function toY(v: number) {
    return PAD_Y + plotH - (v / Math.max(yMax, 1)) * plotH
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    y: toY(yMax * r),
    label:
      yMax * r >= 1_000_000
        ? `${Math.round((yMax * r) / 10000)}만`
        : yMax * r >= 1000
        ? `${Math.round((yMax * r) / 1000)}천`
        : String(Math.round(yMax * r)),
  }))

  // X: show at most 7 evenly-spaced labels to avoid overlap
  const step = Math.max(1, Math.ceil(xLabels.length / 7))
  const xIndices = xLabels
    .map((_, i) => i)
    .filter((i) => i % step === 0 || i === xLabels.length - 1)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
      {/* Grid + Y labels */}
      {yTicks.map(({ y, label }) => (
        <g key={label}>
          <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          <text x={PAD_X - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
            {label}
          </text>
        </g>
      ))}

      {/* Series */}
      {series.map((s, si) => {
        const pts = s.points.map((p) => `${toX(p.x)},${toY(p.y)}`).join(' ')
        const areaStart = `${toX(s.points[0]?.x ?? 0)},${PAD_Y + plotH}`
        const areaEnd = `${toX(s.points[s.points.length - 1]?.x ?? lastIdx)},${PAD_Y + plotH}`
        return (
          <g key={si}>
            {s.fill && (
              <polygon
                points={`${areaStart} ${pts} ${areaEnd}`}
                fill={s.fill}
              />
            )}
            <polyline
              points={pts}
              fill="none"
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 2}
              strokeLinejoin="round"
            />
            {s.points.map((p, i) => {
              const seriesLabel = seriesLabels?.[si]
              const valStr = valueFormatter ? valueFormatter(p.y) : p.y.toLocaleString()
              const tip = `${xLabels[i] ?? ''}${seriesLabel ? ` · ${seriesLabel}` : ''}: ${valStr}`
              return (
                <g key={i}>
                  <circle cx={toX(p.x)} cy={toY(p.y)} r="3" fill={s.stroke} />
                  {/* 히트박스 + 네이티브 툴팁 */}
                  <circle cx={toX(p.x)} cy={toY(p.y)} r="12" fill="transparent" style={{ cursor: 'pointer' }}>
                    <title>{tip}</title>
                  </circle>
                </g>
              )
            })}
          </g>
        )
      })}

      {/* X labels */}
      {xIndices.map((i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">
          {xLabels[i]}
        </text>
      ))}
    </svg>
  )
}

// ── component ────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const [dailyStats, setDailyStats] = useState<DayStat[]>([])
  const [monthlyData, setMonthlyData] = useState<Record<string, Record<number, { pv: number; uv: number }>>>({})
  const [viewMode, setViewMode] = useState<'visitors' | 'pageviews'>('visitors')
  const [loading, setLoading] = useState(true)
  const [periodDays, setPeriodDays] = useState(7)

  // Funnel data
  const [funnelData, setFunnelData] = useState({
    visitors: 0,
    storeViews: 0,
    orders: 0,
    completed: 0,
  })

  // Referrer data
  const [referrers, setReferrers] = useState<ReferrerStat[]>([])
  const [totalRefs, setTotalRefs] = useState(0)

  // Top pages
  const [topPages, setTopPages] = useState<{ path: string; count: number }[]>([])

  // Search keywords
  const [keywords, setKeywords] = useState<{ keyword: string; count: number }[]>([])

  // Recent signups
  const [recentSignups, setRecentSignups] = useState<{ name: string | null; email: string | null; created_at: string }[]>([])

  const fetchAll = useCallback(async () => {
    const supabase = createClient()
    const today = startOfDay(new Date())
    const sevenAgo = addDays(today, -(periodDays - 1))
    const rangeStart = isoDate(sevenAgo)
    const rangeEnd = isoDate(addDays(today, 1))

    // page_views for the selected period (date-filtered — no more all-rows fetch)
    const { data: pvRows } = await supabase
      .from('page_views')
      .select('created_at, session_id, path, referrer')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // orders for the period
    const { data: orderRows } = await supabase
      .from('orders')
      .select('created_at, total_amount, status')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // profiles (signups)
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // consulting_requests
    const { data: consultingRows } = await supabase
      .from('consulting_requests')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // reviews
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('created_at')
      .gte('created_at', rangeStart)
      .lt('created_at', rangeEnd)

    // Build daily stats
    const stats: DayStat[] = []
    for (let i = 0; i < periodDays; i++) {
      const d = addDays(sevenAgo, i)
      const dateStr = isoDate(d)
      const dayPvs = (pvRows || []).filter((r) => kstDateKey(r.created_at) === dateStr)
      const daySessions = new Set(dayPvs.map((r) => r.session_id))
      const dayOrders = (orderRows || []).filter(
        (r) => kstDateKey(r.created_at) === dateStr && ['paid', 'completed'].includes(r.status)
      )
      const daySignups = (profileRows || []).filter((r) => kstDateKey(r.created_at) === dateStr)
      const dayConsulting = (consultingRows || []).filter(
        (r) => kstDateKey(r.created_at) === dateStr
      )
      const dayReviews = (reviewRows || []).filter((r) => kstDateKey(r.created_at) === dateStr)

      stats.push({
        date: dateStr,
        pageViews: dayPvs.length,
        visitors: daySessions.size,
        orders: dayOrders.length,
        revenue: dayOrders.reduce((s, o) => s + (o.total_amount || 0), 0),
        signups: daySignups.length,
        consulting: dayConsulting.length,
        reviews: dayReviews.length,
      })
    }
    setDailyStats(stats)

    // ── Funnel ───────────────────────────────────────────────────────
    const allSessions = new Set((pvRows || []).map((r) => r.session_id))
    const storeSessions = new Set(
      (pvRows || []).filter((r) => r.path?.startsWith('/store/')).map((r) => r.session_id)
    )
    // 장바구니(주문 생성) = 취소/환불 제외한 유효 주문
    const allOrders = (orderRows || []).filter(
      (r) => !['cancelled', 'refunded', 'canceled'].includes(r.status)
    ).length
    const completedOrders = (orderRows || []).filter((r) =>
      ['paid', 'completed'].includes(r.status)
    ).length

    setFunnelData({
      visitors: allSessions.size,
      storeViews: storeSessions.size,
      orders: allOrders,
      completed: completedOrders,
    })

    // ── Referrer analysis ─────────────────────────────────────────────
    const refMap: Record<string, number> = {}
    for (const row of pvRows || []) {
      const key = normalizeReferrer(row.referrer)
      refMap[key] = (refMap[key] || 0) + 1
    }
    const sorted = Object.entries(refMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([referrer, count]) => ({ referrer, count }))
    setReferrers(sorted)
    setTotalRefs((pvRows || []).length)

    // ── 많이 방문한 페이지 TOP 10 ──────────────────────────────────────
    const pathMap: Record<string, number> = {}
    for (const row of pvRows || []) {
      if (!row.path) continue
      pathMap[row.path] = (pathMap[row.path] || 0) + 1
    }
    const topPaths = Object.entries(pathMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }))
    setTopPages(topPaths)

    // ── 유입 검색어 TOP 10 ────────────────────────────────────────────
    const kwMap: Record<string, number> = {}
    for (const row of pvRows || []) {
      const kw = extractSearchKeyword(row.referrer)
      if (!kw) continue
      kwMap[kw] = (kwMap[kw] || 0) + 1
    }
    const topKw = Object.entries(kwMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([keyword, count]) => ({ keyword, count }))
    setKeywords(topKw)

    // ── 최근 가입자 5명 (컨텐츠 반응) ─────────────────────────────────
    const { data: signupList } = await supabase
      .from('profiles')
      .select('name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    setRecentSignups(signupList || [])

    // ── Monthly/Yearly — fetch ALL page_views (count only per month) ──
    // Still need all-time data for the monthly table; we fetch only session_id + created_at
    const { data: allPv } = await supabase
      .from('page_views')
      .select('created_at, session_id')
      .order('created_at', { ascending: true })

    const monthly: Record<string, Record<number, { pv: number; uv: number }>> = {}
    const sessionsByMonth: Record<string, Record<number, Set<string>>> = {}

    for (const row of allPv || []) {
      const d = new Date(row.created_at)
      const y = String(d.getFullYear())
      const m = d.getMonth() + 1
      if (!monthly[y]) monthly[y] = {}
      if (!monthly[y][m]) monthly[y][m] = { pv: 0, uv: 0 }
      monthly[y][m].pv += 1

      if (!sessionsByMonth[y]) sessionsByMonth[y] = {}
      if (!sessionsByMonth[y][m]) sessionsByMonth[y][m] = new Set()
      sessionsByMonth[y][m].add(row.session_id)
    }
    for (const y of Object.keys(sessionsByMonth)) {
      for (const m of Object.keys(sessionsByMonth[y])) {
        if (!monthly[y]) monthly[y] = {}
        if (!monthly[y][+m]) monthly[y][+m] = { pv: 0, uv: 0 }
        monthly[y][+m].uv = sessionsByMonth[y][+m].size
      }
    }
    setMonthlyData(monthly)
    setLoading(false)
  }, [periodDays])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAll()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchAll])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        데이터를 불러오는 중...
      </div>
    )
  }

  // ── Chart data ────────────────────────────────────────────────────────
  const maxPv = Math.max(...dailyStats.map((s) => s.pageViews), 1)
  const maxUv = Math.max(...dailyStats.map((s) => s.visitors), 1)
  const pvuvMax = Math.max(maxPv, maxUv, 1)
  const maxRevenue = Math.max(...dailyStats.map((s) => s.revenue), 1)

  const pvSeries: LineChartSeries = {
    points: dailyStats.map((s, i) => ({ x: i, y: s.pageViews })),
    stroke: 'rgba(147,197,253,0.8)',
    fill: 'rgba(147,197,253,0.2)',
    strokeWidth: 2,
  }
  const uvSeries: LineChartSeries = {
    points: dailyStats.map((s, i) => ({ x: i, y: s.visitors })),
    stroke: '#2563eb',
    strokeWidth: 2.5,
  }
  const revSeries: LineChartSeries = {
    points: dailyStats.map((s, i) => ({ x: i, y: s.revenue })),
    stroke: '#ef4444',
    fill: 'rgba(239,68,68,0.08)',
    strokeWidth: 2.5,
  }

  const xLabels = dailyStats.map((s) => fmt(new Date(s.date)))

  // Monthly/Yearly
  const years = Object.keys(monthlyData).sort()
  if (years.length === 0) {
    const curYear = String(new Date().getFullYear())
    if (!years.includes(curYear)) years.push(curYear)
  }

  // Weekly calendar (last 4 weeks)
  const todayDate = startOfDay(new Date())
  const todayDow = todayDate.getDay()
  const lastSunday = addDays(todayDate, -todayDow)
  const weeks: { start: Date; days: (DayStat | null)[] }[] = []
  for (let w = 3; w >= 0; w--) {
    const weekStart = addDays(lastSunday, -w * 7)
    const days: (DayStat | null)[] = []
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d)
      const ds = isoDate(date)
      const match = dailyStats.find((s) => s.date === ds)
      days.push(match || null)
    }
    weeks.push({ start: weekStart, days })
  }

  function daysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate()
  }

  // ── Funnel bars ───────────────────────────────────────────────────────
  const funnelSteps = [
    { label: '방문자 수', value: funnelData.visitors, color: 'bg-primary' },
    { label: '상품 조회 (/store/)', value: funnelData.storeViews, color: 'bg-indigo-500' },
    { label: '장바구니 (주문 생성)', value: funnelData.orders, color: 'bg-amber-500' },
    { label: '구매 완료', value: funnelData.completed, color: 'bg-blue-500' },
  ]
  const funnelMax = Math.max(funnelData.visitors, 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">통계 분석</h1>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                periodDays === days
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {days}일
            </button>
          ))}
        </div>
      </div>

      {/* ── 방문자 차트 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          방문자 추이 (최근 {periodDays}일)
        </h2>
        <div className="flex items-center gap-6 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(147,197,253,0.5)' }} />
            페이지뷰
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-primary" />
            방문자
          </span>
        </div>
        <LineChart
          series={[pvSeries, uvSeries]}
          xLabels={xLabels}
          yMax={pvuvMax}
          height={200}
          seriesLabels={['페이지뷰', '방문자']}
        />
      </div>

      {/* ── 매출 추이 차트 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">
          매출 추이 (최근 {periodDays}일, 결제완료 기준)
        </h2>
        <div className="flex items-center gap-6 mb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-500" />
            일별 매출
          </span>
          <span className="text-muted-foreground ml-auto font-medium">
            기간 합계: {dailyStats.reduce((a, s) => a + s.revenue, 0).toLocaleString()}원
          </span>
        </div>
        <LineChart
          series={[revSeries]}
          xLabels={xLabels}
          yMax={maxRevenue}
          height={200}
          seriesLabels={['일별 매출']}
          valueFormatter={(v) => `${v.toLocaleString()}원`}
        />
      </div>

      {/* ── 전환 퍼널 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-5">
          전환 퍼널 (최근 {periodDays}일)
        </h2>
        <div className="space-y-4">
          {funnelSteps.map((step, i) => {
            const pct = funnelMax > 0 ? Math.round((step.value / funnelMax) * 100) : 0
            const prevValue = i > 0 ? funnelSteps[i - 1].value : step.value
            const dropPct =
              i > 0 && prevValue > 0
                ? Math.round((step.value / prevValue) * 100)
                : null

            return (
              <div key={step.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">{step.label}</span>
                    {dropPct !== null && (
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                        전단계 대비 {dropPct}%
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {step.value.toLocaleString()}
                    <span className="text-xs text-muted-foreground font-normal ml-1">({pct}%)</span>
                  </span>
                </div>
                <div className="h-7 w-full bg-muted rounded-xl overflow-hidden">
                  <div
                    className={`h-full ${step.color} rounded-xl transition-all duration-500 flex items-center justify-end pr-2`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
                  >
                    {pct >= 8 && (
                      <span className="text-white text-xs font-medium">{pct}%</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {funnelData.visitors === 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">이 기간의 방문 데이터가 없습니다</p>
        )}
      </div>

      {/* ── 유입 경로 (레퍼러) ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-5">
          유입 경로 (최근 {periodDays}일)
        </h2>
        {referrers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">유입 데이터가 없습니다</p>
        ) : (
          <div className="space-y-3">
            {referrers.map((ref) => {
              const pct = totalRefs > 0 ? Math.round((ref.count / totalRefs) * 100) : 0
              return (
                <div key={ref.referrer}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground font-medium truncate max-w-[60%]">
                      {ref.referrer}
                    </span>
                    <span className="text-sm text-muted-foreground shrink-0 ml-2">
                      {ref.count.toLocaleString()}건{' '}
                      <span className="text-muted-foreground text-xs">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 많이 방문한 페이지 + 유입 검색어 (2컬럼) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">많이 방문한 페이지</h2>
          {topPages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">데이터 없음</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 font-medium">제목</th>
                  <th className="text-left py-2 px-3 font-medium">URL</th>
                  <th className="text-right py-2 font-medium">조회</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p, i) => (
                  <tr key={p.path} className={i % 2 === 1 ? 'bg-muted' : ''}>
                    <td className="py-2 text-foreground">{pathLabel(p.path)}</td>
                    <td className="py-2 px-3 text-muted-foreground text-xs truncate max-w-[180px]">{p.path}</td>
                    <td className="py-2 text-right font-medium text-primary">{p.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">유입 검색어</h2>
          {keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">유입 검색어 없음 (검색엔진 referrer가 있어야 표시됩니다)</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <th className="text-left py-2 font-medium">검색어</th>
                  <th className="text-right py-2 font-medium">클릭수</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k, i) => (
                  <tr key={k.keyword} className={i % 2 === 1 ? 'bg-muted' : ''}>
                    <td className="py-2 text-foreground">{k.keyword}</td>
                    <td className="py-2 text-right font-medium text-primary">{k.count.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── 최근 가입자 (컨텐츠 반응) ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">최근 가입자</h2>
        {recentSignups.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">가입자 없음</p>
        ) : (
          <div className="space-y-3">
            {recentSignups.map((u) => (
              <div key={u.created_at} className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-xs shrink-0">
                  {(u.name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground font-medium">{u.name || u.email || '이름없음'}</span>
                  <span className="text-muted-foreground ml-2">님이 가입했습니다.</span>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {new Date(u.created_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 기간별 분석 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">기간별 분석 (최근 {periodDays}일)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 font-medium">일자</th>
                <th className="text-right py-2 px-3 font-medium">주문수</th>
                <th className="text-right py-2 px-3 font-medium">매출액</th>
                <th className="text-right py-2 px-3 font-medium">방문자</th>
                <th className="text-right py-2 px-3 font-medium">가입</th>
                <th className="text-right py-2 px-3 font-medium">문의</th>
                <th className="text-right py-2 px-3 font-medium">후기</th>
              </tr>
            </thead>
            <tbody>
              {[...dailyStats].reverse().map((s, i) => (
                <tr key={s.date} className={i % 2 === 1 ? 'bg-muted' : ''}>
                  <td className="py-2 pr-4 text-foreground">{s.date}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{s.orders}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{s.revenue.toLocaleString()}원</td>
                  <td className="py-2 px-3 text-right text-primary font-medium">{s.visitors}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{s.signups}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{s.consulting}</td>
                  <td className="py-2 px-3 text-right text-muted-foreground">{s.reviews}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border font-medium text-foreground bg-muted">
                <td className="py-2 pr-4">합계</td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.orders, 0)}</td>
                <td className="py-2 px-3 text-right">
                  {dailyStats.reduce((a, s) => a + s.revenue, 0).toLocaleString()}원
                </td>
                <td className="py-2 px-3 text-right text-primary">
                  {dailyStats.reduce((a, s) => a + s.visitors, 0)}
                </td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.signups, 0)}</td>
                <td className="py-2 px-3 text-right">
                  {dailyStats.reduce((a, s) => a + s.consulting, 0)}
                </td>
                <td className="py-2 px-3 text-right">{dailyStats.reduce((a, s) => a + s.reviews, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── 월간 및 연간 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">월간 및 연간</h2>
          <div className="flex rounded-xl border border-border overflow-hidden text-xs">
            <button
              onClick={() => setViewMode('visitors')}
              className={`px-3 py-1.5 cursor-pointer ${
                viewMode === 'visitors'
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              }`}
            >
              방문자
            </button>
            <button
              onClick={() => setViewMode('pageviews')}
              className={`px-3 py-1.5 cursor-pointer ${
                viewMode === 'pageviews'
                  ? 'bg-primary text-white'
                  : 'bg-white text-muted-foreground hover:bg-muted'
              }`}
            >
              페이지뷰
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 font-medium">연도</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-right py-2 px-2 font-medium">
                    {i + 1}월
                  </th>
                ))}
                <th className="text-right py-2 pl-3 font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {years.map((y, yi) => {
                let total = 0
                return (
                  <tr key={y} className={yi % 2 === 1 ? 'bg-muted' : ''}>
                    <td className="py-2 pr-4 font-medium text-foreground">{y}</td>
                    {Array.from({ length: 12 }, (_, i) => {
                      const m = i + 1
                      const val = monthlyData[y]?.[m]
                        ? viewMode === 'visitors'
                          ? monthlyData[y][m].uv
                          : monthlyData[y][m].pv
                        : 0
                      total += val
                      return (
                        <td key={m} className="py-2 px-2 text-right text-muted-foreground">
                          {val > 0 ? val.toLocaleString() : '-'}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-3 text-right font-medium text-primary">
                      {total > 0 ? total.toLocaleString() : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 일간 평균 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">일간 평균 (방문자)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 font-medium">연도</th>
                {Array.from({ length: 12 }, (_, i) => (
                  <th key={i} className="text-right py-2 px-2 font-medium">
                    {i + 1}월
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {years.map((y, yi) => (
                <tr key={y} className={yi % 2 === 1 ? 'bg-muted' : ''}>
                  <td className="py-2 pr-4 font-medium text-foreground">{y}</td>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1
                    const uv = monthlyData[y]?.[m]?.uv || 0
                    const days = daysInMonth(+y, m)
                    const avg = uv > 0 ? (uv / days).toFixed(1) : '-'
                    return (
                      <td key={m} className="py-2 px-2 text-right text-muted-foreground">
                        {avg}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 최근 주별 현황 ── */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">최근 주별 현황</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <th className="text-left py-2 pr-4 font-medium">주</th>
                {DAY_LABELS.map((d) => (
                  <th key={d} className="text-center py-2 px-3 font-medium">
                    {d}
                  </th>
                ))}
                <th className="text-right py-2 pl-3 font-medium">합계</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => {
                const weekTotal = week.days.reduce((a, d) => a + (d?.visitors || 0), 0)
                return (
                  <tr key={wi} className={wi % 2 === 1 ? 'bg-muted' : ''}>
                    <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap">
                      {fmt(week.start)}~{fmt(addDays(week.start, 6))}
                    </td>
                    {week.days.map((d, di) => {
                      const dateObj = addDays(week.start, di)
                      const isFuture = dateObj > todayDate
                      return (
                        <td
                          key={di}
                          className={`py-2 px-3 text-center ${
                            isFuture
                              ? 'text-muted-foreground'
                              : d
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {isFuture ? '' : d ? d.visitors : 0}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-3 text-right font-medium text-primary">{weekTotal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
