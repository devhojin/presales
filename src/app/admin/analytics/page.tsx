'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity,
  ArrowDownRight,
  BarChart3,
  CircleDollarSign,
  MousePointerClick,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react'
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type {
  AdminAnalyticsDayStat,
  AdminAnalyticsFunnel,
  AdminAnalyticsSummary,
} from '@/lib/admin-analytics'

type DayStat = AdminAnalyticsDayStat

type PeriodDays = 7 | 30 | 90

interface ReferrerStat {
  referrer: string
  count: number
}

interface ChartDatum {
  date: string
  label: string
  pageViews: number
  visitors: number
  revenue: number
  orders: number
  storeViews: number
  cartViews: number
  checkoutViews: number
  signups: number
  consulting: number
  reviews: number
}

interface TooltipPayload<T> {
  dataKey?: string | number
  name?: string | number
  value?: number | string
  color?: string
  payload?: T
}

interface ChartTooltipProps<T> {
  active?: boolean
  payload?: TooltipPayload<T>[]
  label?: string | number
}

interface ChartSize {
  width: number
  height: number
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

const TRAFFIC_COLORS = {
  pageViews: '#93c5fd',
  visitors: '#2563eb',
  storeViews: '#14b8a6',
  cartViews: '#f59e0b',
  checkoutViews: '#ef4444',
}

const ACTION_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#64748b']

function compactNumber(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`
  return value.toLocaleString()
}

function currency(value: number): string {
  return `${value.toLocaleString()}원`
}

function compactCurrency(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억원`
  if (value >= 10_000) return `${Math.round(value / 10_000).toLocaleString()}만원`
  return currency(value)
}

function percent(value: number, total: number): string {
  if (total <= 0) return '0%'
  const pct = (value / total) * 100
  if (pct > 0 && pct < 1) return '<1%'
  return `${Math.round(pct)}%`
}

function formatMonthDay(ymd: string): string {
  const [, month, day] = ymd.split('-')
  return `${month}/${day}`
}

function formatFullDate(ymd: string): string {
  return ymd.replace(/-/g, '.')
}

function isoDate(d: Date) {
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  return kst.toISOString().slice(0, 10)
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function pathLabel(path: string): string {
  if (!path || path === '/') return '홈'
  if (path === '/store') return '스토어'
  if (path.startsWith('/store/')) return '상품 상세'
  if (path === '/announcements') return '공고 목록'
  if (path.startsWith('/announcements/')) return '공고 상세'
  if (path === '/feeds') return 'IT 피드'
  if (path.startsWith('/feeds/')) return 'IT 피드 상세'
  if (path === '/brief') return '데일리 브리프'
  if (path.startsWith('/brief/')) return '브리프 상세'
  if (path === '/consulting') return '컨설팅'
  if (path === '/about') return '회사소개'
  if (path === '/us') return 'Us'
  if (path === '/faq') return 'FAQ'
  if (path === '/mypage') return '나의콘솔'
  if (path === '/auth/login') return '로그인'
  if (path === '/auth/signup') return '회원가입'
  return path
}

function Panel({
  title,
  subtitle,
  children,
  action,
  className = '',
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section className={`min-w-0 rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-slate-950">{title}</h2>
          {subtitle && <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function ChartFrame({
  className,
  children,
}: {
  className: string
  children: (size: ChartSize) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState<ChartSize>({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const updateSize = (width: number, height: number) => {
      const next = {
        width: Math.floor(width),
        height: Math.floor(height),
      }

      if (next.width <= 0 || next.height <= 0) return

      setSize((prev) =>
        prev.width === next.width && prev.height === next.height ? prev : next,
      )
    }

    const rect = node.getBoundingClientRect()
    updateSize(rect.width, rect.height)

    const observer = new ResizeObserver(([entry]) => {
      updateSize(entry.contentRect.width, entry.contentRect.height)
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`min-w-0 ${className}`}>
      {size.width > 0 && size.height > 0 ? (
        children(size)
      ) : (
        <div className="h-full w-full rounded-lg bg-slate-50" aria-hidden="true" />
      )}
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Users
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="font-mono text-3xl font-semibold text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function TrafficTooltip({ active, payload }: ChartTooltipProps<ChartDatum>) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <p className="mb-3 font-semibold text-slate-950">{formatFullDate(row.date)}</p>
      <div className="space-y-2">
        <TooltipLine color={TRAFFIC_COLORS.pageViews} label="페이지뷰" value={row.pageViews.toLocaleString()} />
        <TooltipLine color={TRAFFIC_COLORS.visitors} label="방문자" value={row.visitors.toLocaleString()} />
        <TooltipLine color={TRAFFIC_COLORS.storeViews} label="스토어/상품" value={row.storeViews.toLocaleString()} />
        <TooltipLine color={TRAFFIC_COLORS.cartViews} label="장바구니" value={row.cartViews.toLocaleString()} />
        <TooltipLine color={TRAFFIC_COLORS.checkoutViews} label="결제 진입" value={row.checkoutViews.toLocaleString()} />
      </div>
    </div>
  )
}

function RevenueTooltip({ active, payload }: ChartTooltipProps<ChartDatum>) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="min-w-[210px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <p className="mb-3 font-semibold text-slate-950">{formatFullDate(row.date)}</p>
      <div className="space-y-2">
        <TooltipLine color="#059669" label="매출" value={currency(row.revenue)} />
        <TooltipLine color="#f59e0b" label="주문수" value={`${row.orders.toLocaleString()}건`} />
        <TooltipLine color="#2563eb" label="방문자" value={row.visitors.toLocaleString()} />
      </div>
    </div>
  )
}

function ActionTooltip({ active, payload }: ChartTooltipProps<ChartDatum>) {
  if (!active || !payload?.length) return null

  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <p className="mb-3 font-semibold text-slate-950">{formatFullDate(row.date)}</p>
      <div className="space-y-2">
        <TooltipLine color={ACTION_COLORS[0]} label="주문" value={`${row.orders.toLocaleString()}건`} />
        <TooltipLine color={ACTION_COLORS[1]} label="가입" value={`${row.signups.toLocaleString()}건`} />
        <TooltipLine color={ACTION_COLORS[2]} label="문의" value={`${row.consulting.toLocaleString()}건`} />
        <TooltipLine color={ACTION_COLORS[3]} label="후기" value={`${row.reviews.toLocaleString()}건`} />
      </div>
    </div>
  )
}

function ReferrerTooltip({
  active,
  payload,
}: ChartTooltipProps<{ label: string; count: number; pct: string }>) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm shadow-xl">
      <p className="mb-2 font-semibold text-slate-950">{row.label}</p>
      <TooltipLine color="#2563eb" label="유입" value={`${row.count.toLocaleString()}건`} />
      <TooltipLine color="#94a3b8" label="비중" value={row.pct} />
    </div>
  )
}

function TooltipLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      <span className="text-slate-600">{label}</span>
      <span className="ml-auto pl-6 font-mono font-semibold text-slate-950">{value}</span>
    </div>
  )
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-3 h-4 w-96 max-w-full animate-pulse rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <div className="h-[460px] animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
        <div className="h-[460px] animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [dailyStats, setDailyStats] = useState<DayStat[]>([])
  const [monthlyData, setMonthlyData] = useState<Record<string, Record<number, { pv: number; uv: number }>>>({})
  const [viewMode, setViewMode] = useState<'visitors' | 'pageviews'>('visitors')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [periodDays, setPeriodDays] = useState<PeriodDays>(30)
  const [funnelData, setFunnelData] = useState<AdminAnalyticsFunnel>({
    visitors: 0,
    storeViews: 0,
    cartViews: 0,
    checkoutViews: 0,
    orders: 0,
    completed: 0,
  })
  const [referrers, setReferrers] = useState<ReferrerStat[]>([])
  const [totalRefs, setTotalRefs] = useState(0)
  const [topPages, setTopPages] = useState<{ path: string; count: number }[]>([])
  const [keywords, setKeywords] = useState<{ keyword: string; count: number }[]>([])
  const [recentSignups, setRecentSignups] = useState<{ name: string | null; email: string | null; created_at: string }[]>([])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setErrorMessage(null)
    try {
      const response = await fetch(`/api/admin/analytics/summary?days=${periodDays}`, {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        throw new Error(`통계 API 오류: ${response.status}`)
      }
      const summary = (await response.json()) as AdminAnalyticsSummary
      setDailyStats(summary.dailyStats)
      setMonthlyData(summary.monthlyData)
      setFunnelData(summary.funnelData)
      setReferrers(summary.referrers)
      setTotalRefs(summary.totalRefs)
      setTopPages(summary.topPages)
      setKeywords(summary.keywords)
      setRecentSignups(summary.recentSignups)
    } catch (error) {
      const message = error instanceof Error ? error.message : '통계 데이터를 불러오지 못했습니다'
      console.error('[admin/analytics] failed to load summary', error)
      setErrorMessage(message)
      setDailyStats([])
      setMonthlyData({})
      setFunnelData({
        visitors: 0,
        storeViews: 0,
        cartViews: 0,
        checkoutViews: 0,
        orders: 0,
        completed: 0,
      })
      setReferrers([])
      setTotalRefs(0)
      setTopPages([])
      setKeywords([])
      setRecentSignups([])
    } finally {
      setLoading(false)
    }
  }, [periodDays])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAll()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [fetchAll])

  const chartData = useMemo<ChartDatum[]>(
    () =>
      dailyStats.map((stat) => ({
        date: stat.date,
        label: formatMonthDay(stat.date),
        pageViews: stat.pageViews,
        visitors: stat.visitors,
        revenue: stat.revenue,
        orders: stat.orders,
        storeViews: stat.storeViews,
        cartViews: stat.cartViews,
        checkoutViews: stat.checkoutViews,
        signups: stat.signups,
        consulting: stat.consulting,
        reviews: stat.reviews,
      })),
    [dailyStats]
  )

  const totals = useMemo(() => {
    const pageViews = dailyStats.reduce((sum, row) => sum + row.pageViews, 0)
    const revenue = dailyStats.reduce((sum, row) => sum + row.revenue, 0)
    const orders = dailyStats.reduce((sum, row) => sum + row.orders, 0)
    const completed = funnelData.completed
    const visitors = funnelData.visitors
    const pagesPerVisitor = visitors > 0 ? pageViews / visitors : 0

    return { pageViews, revenue, orders, completed, visitors, pagesPerVisitor }
  }, [dailyStats, funnelData])

  const referrerChart = useMemo(
    () =>
      referrers.map((item) => ({
        label: item.referrer,
        count: item.count,
        pct: percent(item.count, totalRefs),
      })),
    [referrers, totalRefs]
  )

  const years = useMemo(() => {
    const keys = Object.keys(monthlyData).sort()
    return keys.length > 0 ? keys : [String(new Date().getFullYear())]
  }, [monthlyData])

  const weeks = useMemo(() => {
    const todayDate = startOfDay(new Date())
    const todayDow = todayDate.getDay()
    const lastSunday = addDays(todayDate, -todayDow)
    const result: { start: Date; days: (DayStat | null)[] }[] = []

    for (let w = 3; w >= 0; w -= 1) {
      const weekStart = addDays(lastSunday, -w * 7)
      const days: (DayStat | null)[] = []
      for (let d = 0; d < 7; d += 1) {
        const date = addDays(weekStart, d)
        const ds = isoDate(date)
        const match = dailyStats.find((stat) => stat.date === ds)
        days.push(match || null)
      }
      result.push({ start: weekStart, days })
    }

    return result
  }, [dailyStats])

  const todayDate = startOfDay(new Date())
  const funnelSteps = [
    { label: '방문자', detail: '고유 session_id', value: funnelData.visitors, color: '#2563eb' },
    { label: '스토어/상품', detail: '/store 접속 세션', value: funnelData.storeViews, color: '#14b8a6' },
    { label: '장바구니', detail: '/cart 접속 세션', value: funnelData.cartViews, color: '#f59e0b' },
    { label: '결제 진입', detail: '/checkout 접속 세션', value: funnelData.checkoutViews, color: '#ef4444' },
    { label: '주문 생성', detail: '취소/환불 제외 주문', value: funnelData.orders, color: '#475569' },
    { label: '구매 완료', detail: 'paid/completed 주문', value: funnelData.completed, color: '#059669' },
  ]

  if (loading) {
    return <AnalyticsSkeleton />
  }

  return (
    <div className="space-y-6">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">analytics console</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-950">통계 분석</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              방문자는 자체 page_views 로그의 고유 세션 기준입니다. 관리자 페이지와 봇성 user-agent는 수집 단계에서 제외됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              {([7, 30, 90] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setPeriodDays(days)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                    periodDays === days
                      ? 'bg-white text-slate-950 shadow-sm'
                      : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  {days}일
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void fetchAll()}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              새로고침
            </button>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          label="방문자"
          value={totals.visitors.toLocaleString()}
          detail={`최근 ${periodDays}일 고유 세션`}
          icon={Users}
        />
        <MetricTile
          label="페이지뷰"
          value={totals.pageViews.toLocaleString()}
          detail={`방문자당 평균 ${totals.pagesPerVisitor.toFixed(1)}페이지`}
          icon={MousePointerClick}
        />
        <MetricTile
          label="매출"
          value={compactCurrency(totals.revenue)}
          detail={`${totals.orders.toLocaleString()}건 주문 기준`}
          icon={CircleDollarSign}
        />
        <MetricTile
          label="구매 완료"
          value={totals.completed.toLocaleString()}
          detail={`방문 대비 ${percent(totals.completed, totals.visitors)}`}
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.9fr)]">
        <Panel
          title="방문 흐름"
          subtitle={`최근 ${periodDays}일 페이지뷰와 방문 세션 추이`}
          action={
            <div className="hidden flex-wrap items-center gap-4 md:flex">
              <LegendItem color={TRAFFIC_COLORS.pageViews} label="페이지뷰" />
              <LegendItem color={TRAFFIC_COLORS.visitors} label="방문자" />
            </div>
          }
        >
          {chartData.length === 0 ? (
            <div className="h-[380px]">
              <EmptyState icon={Activity} label="방문 데이터가 없습니다" />
            </div>
          ) : (
            <ChartFrame className="h-[380px]">
              {({ width, height }) => (
                <ComposedChart
                  width={width}
                  height={height}
                  data={chartData}
                  margin={{ top: 10, right: 18, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="trafficPageViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={TRAFFIC_COLORS.pageViews} stopOpacity={0.72} />
                      <stop offset="100%" stopColor={TRAFFIC_COLORS.pageViews} stopOpacity={0.14} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    minTickGap={16}
                  />
                  <YAxis
                    tickFormatter={(value: number) => compactNumber(value)}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={54}
                  />
                  <Tooltip content={<TrafficTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                  <Bar
                    dataKey="pageViews"
                    name="페이지뷰"
                    fill="url(#trafficPageViews)"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={36}
                  />
                  <Line
                    type="monotone"
                    dataKey="visitors"
                    name="방문자"
                    stroke={TRAFFIC_COLORS.visitors}
                    strokeWidth={2.6}
                    dot={periodDays <= 30 ? { r: 3, fill: TRAFFIC_COLORS.visitors } : false}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              )}
            </ChartFrame>
          )}
        </Panel>

        <Panel
          title="매출 추이"
          subtitle="결제 완료 주문 기준"
          action={<span className="font-mono text-sm font-semibold text-emerald-700">{currency(totals.revenue)}</span>}
        >
          {chartData.length === 0 ? (
            <div className="h-[380px]">
              <EmptyState icon={CircleDollarSign} label="매출 데이터가 없습니다" />
            </div>
          ) : (
            <ChartFrame className="h-[380px]">
              {({ width, height }) => (
                <ComposedChart
                  width={width}
                  height={height}
                  data={chartData}
                  margin={{ top: 10, right: 18, left: 0, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.34} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    minTickGap={16}
                  />
                  <YAxis
                    yAxisId="revenue"
                    tickFormatter={(value: number) => compactCurrency(value)}
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                  />
                  <YAxis yAxisId="orders" orientation="right" hide />
                  <Tooltip content={<RevenueTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="매출"
                    stroke="#059669"
                    strokeWidth={2.4}
                    fill="url(#revenueArea)"
                  />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    name="주문수"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </ComposedChart>
              )}
            </ChartFrame>
          )}
        </Panel>
      </div>

      <Panel
        title="일별 운영 지표"
        subtitle="주문, 가입, 문의, 후기 흐름을 한 그래프에서 비교합니다"
        action={
          <div className="hidden flex-wrap items-center gap-4 lg:flex">
            <LegendItem color={ACTION_COLORS[0]} label="주문" />
            <LegendItem color={ACTION_COLORS[1]} label="가입" />
            <LegendItem color={ACTION_COLORS[2]} label="문의" />
            <LegendItem color={ACTION_COLORS[3]} label="후기" />
          </div>
        }
      >
        {chartData.length === 0 ? (
          <div className="h-[310px]">
            <EmptyState icon={BarChart3} label="운영 지표 데이터가 없습니다" />
          </div>
        ) : (
          <ChartFrame className="h-[310px]">
            {({ width, height }) => (
              <BarChart
                width={width}
                height={height}
                data={chartData}
                margin={{ top: 10, right: 18, left: 0, bottom: 4 }}
                barCategoryGap="24%"
              >
                <CartesianGrid stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  minTickGap={16}
                />
                <YAxis
                  tickFormatter={(value: number) => compactNumber(value)}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ActionTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                <Bar dataKey="orders" name="주문" fill={ACTION_COLORS[0]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="signups" name="가입" fill={ACTION_COLORS[1]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="consulting" name="문의" fill={ACTION_COLORS[2]} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Bar dataKey="reviews" name="후기" fill={ACTION_COLORS[3]} radius={[3, 3, 0, 0]} maxBarSize={18} />
              </BarChart>
            )}
          </ChartFrame>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel title="전환 퍼널" subtitle={`최근 ${periodDays}일 방문자에서 구매 완료까지`}>
          <div className="space-y-3">
            {funnelSteps.map((step, index) => {
              const width = percentWidth(step.value, funnelData.visitors)
              const prev = index > 0 ? funnelSteps[index - 1].value : step.value
              const ratioLabel = index > 0 ? stepRatioLabel(step.value, prev) : '기준값'
              return (
                <div key={step.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{step.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{step.detail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-semibold text-slate-950">{step.value.toLocaleString()}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{ratioLabel}</p>
                    </div>
                  </div>
                  <div className="h-3 overflow-hidden rounded-md bg-white">
                    <div className="h-full rounded-md" style={{ width, backgroundColor: step.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="유입 경로" subtitle="referrer 기준 상위 유입">
          {referrerChart.length === 0 ? (
            <div className="h-[360px]">
              <EmptyState icon={ArrowDownRight} label="유입 데이터가 없습니다" />
            </div>
          ) : (
            <ChartFrame className="h-[360px]">
              {({ width, height }) => (
                <BarChart
                  width={width}
                  height={height}
                  data={referrerChart}
                  layout="vertical"
                  margin={{ top: 4, right: 18, left: 12, bottom: 4 }}
                >
                  <CartesianGrid stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="label"
                    tick={{ fontSize: 12, fill: '#475569' }}
                    tickLine={false}
                    axisLine={false}
                    width={92}
                  />
                  <Tooltip content={<ReferrerTooltip />} cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} />
                  <Bar dataKey="count" name="유입" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {referrerChart.map((_, index) => (
                      <Cell key={index} fill={ACTION_COLORS[index % ACTION_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ChartFrame>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="많이 방문한 페이지" subtitle="상위 10개 경로">
          {topPages.length === 0 ? (
            <EmptyState icon={MousePointerClick} label="페이지 데이터가 없습니다" compact />
          ) : (
            <RankedList
              rows={topPages.map((row) => ({
                key: row.path,
                label: pathLabel(row.path),
                detail: row.path,
                value: row.count,
              }))}
            />
          )}
        </Panel>

        <Panel title="유입 검색어" subtitle="검색엔진 referrer에서 확인된 키워드">
          {keywords.length === 0 ? (
            <EmptyState icon={Search} label="유입 검색어가 없습니다" compact />
          ) : (
            <RankedList
              rows={keywords.map((row) => ({
                key: row.keyword,
                label: row.keyword,
                detail: '검색 유입',
                value: row.count,
              }))}
            />
          )}
        </Panel>
      </div>

      <Panel title="기간별 분석" subtitle={`최근 ${periodDays}일 일별 원자료`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs text-slate-500">
                <th className="py-3 pr-4 text-left font-semibold">일자</th>
                <th className="px-3 py-3 text-right font-semibold">페이지뷰</th>
                <th className="px-3 py-3 text-right font-semibold">방문자</th>
                <th className="px-3 py-3 text-right font-semibold">주문수</th>
                <th className="px-3 py-3 text-right font-semibold">매출액</th>
                <th className="px-3 py-3 text-right font-semibold">가입</th>
                <th className="px-3 py-3 text-right font-semibold">문의</th>
                <th className="px-3 py-3 text-right font-semibold">후기</th>
              </tr>
            </thead>
            <tbody>
              {[...dailyStats].reverse().map((stat) => (
                <tr key={stat.date} className="border-b border-slate-100 last:border-0">
                  <td className="py-3 pr-4 font-medium text-slate-950">{formatFullDate(stat.date)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{stat.pageViews.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-blue-700">{stat.visitors.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{stat.orders.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{currency(stat.revenue)}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{stat.signups.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{stat.consulting.toLocaleString()}</td>
                  <td className="px-3 py-3 text-right font-mono text-slate-600">{stat.reviews.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300 bg-slate-50 font-semibold text-slate-950">
                <td className="py-3 pr-4">합계</td>
                <td className="px-3 py-3 text-right font-mono">{totals.pageViews.toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-mono text-blue-700">{dailyStats.reduce((sum, row) => sum + row.visitors, 0).toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-mono">{totals.orders.toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-mono">{currency(totals.revenue)}</td>
                <td className="px-3 py-3 text-right font-mono">{dailyStats.reduce((sum, row) => sum + row.signups, 0).toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-mono">{dailyStats.reduce((sum, row) => sum + row.consulting, 0).toLocaleString()}</td>
                <td className="px-3 py-3 text-right font-mono">{dailyStats.reduce((sum, row) => sum + row.reviews, 0).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Panel
          title="월간 및 연간"
          subtitle="전체 page_views 누적 기준"
          action={
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setViewMode('visitors')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'visitors' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                방문자
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pageviews')}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold ${
                  viewMode === 'pageviews' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                페이지뷰
              </button>
            </div>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pr-4 text-left font-semibold">연도</th>
                  {Array.from({ length: 12 }, (_, i) => (
                    <th key={i} className="px-2 py-3 text-right font-semibold">
                      {i + 1}월
                    </th>
                  ))}
                  <th className="py-3 pl-3 text-right font-semibold">합계</th>
                </tr>
              </thead>
              <tbody>
                {years.map((year) => {
                  let total = 0
                  return (
                    <tr key={year} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4 font-semibold text-slate-950">{year}</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const month = i + 1
                        const value = monthlyData[year]?.[month]
                          ? viewMode === 'visitors'
                            ? monthlyData[year][month].uv
                            : monthlyData[year][month].pv
                          : 0
                        total += value
                        return (
                          <td key={month} className="px-2 py-3 text-right font-mono text-slate-600">
                            {value > 0 ? value.toLocaleString() : '-'}
                          </td>
                        )
                      })}
                      <td className="py-3 pl-3 text-right font-mono font-semibold text-blue-700">
                        {total > 0 ? total.toLocaleString() : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="최근 주별 현황" subtitle="일별 방문자 기준">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="py-3 pr-4 text-left font-semibold">주</th>
                  {DAY_LABELS.map((day) => (
                    <th key={day} className="px-3 py-3 text-center font-semibold">
                      {day}
                    </th>
                  ))}
                  <th className="py-3 pl-3 text-right font-semibold">합계</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((week) => {
                  const weekTotal = week.days.reduce((sum, day) => sum + (day?.visitors || 0), 0)
                  return (
                    <tr key={week.start.toISOString()} className="border-b border-slate-100 last:border-0">
                      <td className="whitespace-nowrap py-3 pr-4 font-medium text-slate-600">
                        {formatMonthDay(isoDate(week.start))}~{formatMonthDay(isoDate(addDays(week.start, 6)))}
                      </td>
                      {week.days.map((day, index) => {
                        const dateObj = addDays(week.start, index)
                        const isFuture = dateObj > todayDate
                        return (
                          <td
                            key={`${week.start.toISOString()}-${index}`}
                            className={`px-3 py-3 text-center font-mono ${
                              isFuture ? 'text-slate-300' : day ? 'font-semibold text-slate-950' : 'text-slate-400'
                            }`}
                          >
                            {isFuture ? '' : day ? day.visitors : 0}
                          </td>
                        )
                      })}
                      <td className="py-3 pl-3 text-right font-mono font-semibold text-blue-700">
                        {weekTotal.toLocaleString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>

      <Panel title="최근 가입자" subtitle="최근 가입한 회원 5명">
        {recentSignups.length === 0 ? (
          <EmptyState icon={Users} label="최근 가입자가 없습니다" compact />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {recentSignups.map((user) => (
              <div key={`${user.email || user.name || 'unknown'}-${user.created_at}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-white font-semibold text-blue-700">
                  {(user.name || user.email || '?').charAt(0).toUpperCase()}
                </div>
                <p className="truncate text-sm font-semibold text-slate-950">{user.name || user.email || '이름없음'}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{user.email || '이메일 없음'}</p>
                <p className="mt-3 text-xs font-medium text-slate-500">{formatFullDate(user.created_at.slice(0, 10))}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )
}

function EmptyState({
  icon: Icon,
  label,
  compact = false,
}: {
  icon: typeof Users
  label: string
  compact?: boolean
}) {
  return (
    <div className={`flex items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-slate-500 ${compact ? 'h-40' : 'h-full min-h-[220px]'}`}>
      <div className="text-center">
        <Icon className="mx-auto h-5 w-5" />
        <p className="mt-2 text-sm font-medium">{label}</p>
      </div>
    </div>
  )
}

function RankedList({
  rows,
}: {
  rows: { key: string; label: string; detail: string; value: number }[]
}) {
  const max = Math.max(...rows.map((row) => row.value), 1)

  return (
    <div className="space-y-3">
      {rows.map((row, index) => {
        const width = percentWidth(row.value, max)
        return (
          <div key={row.key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-950">
                  <span className="mr-2 font-mono text-xs text-slate-400">{String(index + 1).padStart(2, '0')}</span>
                  {row.label}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">{row.detail}</p>
              </div>
              <p className="font-mono text-sm font-semibold text-blue-700">{row.value.toLocaleString()}</p>
            </div>
            <div className="h-2 overflow-hidden rounded-md bg-white">
              <div className="h-full rounded-md bg-blue-600" style={{ width }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function percentWidth(value: number, total: number): string {
  if (value <= 0 || total <= 0) return '0%'
  return `${Math.max((value / total) * 100, 2)}%`
}

function stepRatioLabel(value: number, previous: number): string {
  if (previous <= 0) return '전 단계 0%'
  if (value > previous) return '전 단계보다 많음'
  return `전 단계 ${percent(value, previous)}`
}
