'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/types'
import type {
  AdminAnalyticsDayStat,
  AdminAnalyticsFunnel,
  AdminAnalyticsSummary,
} from '@/lib/admin-analytics'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  ShoppingCart,
  CreditCard,
  Users,
  TrendingUp,
  Download,
  MessageSquare,
  Star,
  ArrowUpRight,
  Bell,
  X,
  PlusCircle,
  AlertCircle,
  Megaphone,
  Rss,
} from 'lucide-react'

// ===========================
// Types
// ===========================

type Period = '7일' | '30일' | '90일' | '전체'

interface KPI {
  products: number
  orders: number
  paidOrders: number
  members: number
  revenue: number
  downloads: number
  consulting: number
  reviews: number
}

interface KPIChange {
  orders: number | null
  paidOrders: number | null
  members: number | null
  revenue: number | null
  downloads: number | null
  consulting: number | null
  reviews: number | null
}

interface DailyRevenue {
  date: string
  revenue: number
}

interface RecentOrder {
  id: number
  order_number: string
  user_id: string
  total_amount: number
  status: string
  created_at: string
}

interface TopProduct {
  id: number
  title: string
  download_count: number
  price: number
}

interface RecentMember {
  id: string
  name: string | null
  email: string
  created_at: string
}

interface RecentConsulting {
  id: number
  name: string
  package_type: string
  status: string
  created_at: string
}

interface RecentReview {
  id: number
  rating: number
  user_id: string
  product_id: number
  created_at: string
  products?: { title: string }[] | { title: string } | null
}

interface RecentDownload {
  id: number
  user_id: string
  product_id: number
  downloaded_at: string
}

interface ProfileMap {
  [id: string]: { name: string; email: string }
}

interface ProductMap {
  [id: number]: string
}

interface Notification {
  id: string
  type: 'order' | 'consulting' | 'review' | 'member'
  title: string
  message: string
  timestamp: Date
}

interface DateFilteredQuery<T> {
  gte(column: string, value: string): T
  lt(column: string, value: string): T
}

interface AdminMemberSummary {
  id: string
  name: string | null
  email: string
  created_at: string
}

interface AdminMembersResponse {
  members: AdminMemberSummary[]
}

// ===========================
// Constants
// ===========================

const PERIODS: Period[] = ['7일', '30일', '90일', '전체']
const inflightDashboardLoads = new Map<Period, Promise<void>>()
let inflightMemberRequest: Promise<AdminMemberSummary[]> | null = null
const EMPTY_FUNNEL: AdminAnalyticsFunnel = {
  visitors: 0,
  storeViews: 0,
  cartViews: 0,
  checkoutViews: 0,
  orders: 0,
  completed: 0,
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '대기', variant: 'outline' },
  paid: { label: '결제완료', variant: 'default' },
  cancelled: { label: '취소', variant: 'secondary' },
  refunded: { label: '환불', variant: 'destructive' },
}

const packageLabels: Record<string, string> = {
  spot: '스팟상담',
  review: '제안서리뷰',
  project: '프로젝트컨설팅',
}

const consultingStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '대기', variant: 'outline' },
  confirmed: { label: '확정', variant: 'default' },
  completed: { label: '완료', variant: 'secondary' },
  cancelled: { label: '취소', variant: 'destructive' },
}

// ===========================
// Helpers
// ===========================

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount)
}

/** Returns ISO date string (YYYY-MM-DD) for the start of the current period */
function getPeriodStart(period: Period): string | null {
  if (period === '전체') return null
  const days = period === '7일' ? 7 : period === '30일' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

/** Returns ISO date string for start of the previous period (for comparison) */
function getPrevPeriodStart(period: Period): string | null {
  if (period === '전체') return null
  const days = period === '7일' ? 7 : period === '30일' ? 30 : 90
  const d = new Date()
  d.setDate(d.getDate() - days * 2)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function getAnalyticsDays(period: Period): 7 | 30 | 90 {
  if (period === '7일') return 7
  if (period === '30일') return 30
  return 90
}

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0
  return Math.round(((current - previous) / previous) * 100)
}

// ===========================
// Skeleton components
// ===========================

function KPISkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="bg-card rounded-2xl border border-border/50 p-6 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
          <div className="h-7 w-20 bg-muted rounded" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-4 bg-muted rounded flex-1" />
          <div className="h-4 bg-muted rounded w-16" />
          <div className="h-4 bg-muted rounded w-12" />
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===========================
// Revenue / Traffic Charts (Recharts)
// ===========================

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

function RevenueChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-zinc-200 px-4 py-3 rounded-lg shadow-lg text-sm">
      <p className="font-bold text-zinc-800 mb-1.5">{String(label).replace(/-/g, '.')}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-sm inline-block ${p.dataKey === 'revenue' ? 'bg-blue-400' : 'bg-zinc-300'}`} />
          <span className="text-zinc-600">{p.dataKey === 'revenue' ? '주문 완료' : '주문취소'}</span>
          <span className="font-semibold text-zinc-900 ml-auto pl-4">{p.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function formatYAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toLocaleString()
}

function RevenueChart({ data, period }: { data: DailyRevenue[]; period: Period }) {
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>(period === '전체' ? 'monthly' : 'daily')

  const chartData = useMemo(() => {
    if (viewMode === 'monthly' && period !== '전체') {
      const monthMap: Record<string, number> = {}
      for (const d of data) {
        const key = d.date.slice(0, 7)
        monthMap[key] = (monthMap[key] || 0) + d.revenue
      }
      return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, revenue]) => ({ date, revenue }))
    }
    return data
  }, [data, viewMode, period])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 text-sm text-muted-foreground">
        데이터가 없습니다
      </div>
    )
  }

  return (
    <div>
      {/* Header: Legend + Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-5 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-400 inline-block" /> 주문 완료</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-zinc-200 inline-block" /> 주문취소</span>
        </div>
        {period !== '전체' && (
          <div className="flex items-center gap-0.5 text-xs text-primary">
            {(['daily', 'monthly'] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-2 py-1 rounded font-medium transition-colors cursor-pointer ${
                  viewMode === m ? 'text-primary underline underline-offset-4' : 'text-zinc-400 hover:text-zinc-600'
                }`}>
                {m === 'daily' ? '일별' : '월별'}
              </button>
            ))}
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barCategoryGap="20%">
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => viewMode === 'monthly' || period === '전체' ? v : v.slice(5).replace('-', '/')}
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            width={65}
          />
          <Tooltip content={<RevenueChartTooltip />} cursor={{ fill: '#f5f5f5' }} />
          <Bar
            dataKey="revenue"
            fill="#6ee7b7"
            radius={[3, 3, 0, 0]}
            maxBarSize={48}
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function VisitorChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm shadow-lg">
      <p className="mb-1.5 font-bold text-zinc-800">{String(label).replace(/-/g, '.')}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center gap-2">
          <span
            className={`inline-block h-3 w-3 rounded-sm ${
              item.dataKey === 'visitors' ? 'bg-blue-600' : 'bg-sky-200'
            }`}
          />
          <span className="text-zinc-600">{item.dataKey === 'visitors' ? '방문자' : '페이지뷰'}</span>
          <span className="ml-auto pl-4 font-semibold text-zinc-900">
            {item.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  )
}

function VisitorTrendChart({ data }: { data: AdminAnalyticsDayStat[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[340px] items-center justify-center text-sm text-[#8b8578]">
        방문 데이터가 없습니다
      </div>
    )
  }

  const chartData = data.map((item) => ({
    date: item.date,
    pageViews: item.pageViews,
    visitors: item.visitors,
  }))

  return (
    <div>
      <div className="mb-4 flex items-center gap-5 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-sky-200" />
          페이지뷰
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-blue-600" />
          방문자
        </span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="dashboardVisitorPageViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#93c5fd" stopOpacity={0.48} />
              <stop offset="95%" stopColor="#93c5fd" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => value.slice(5).replace('-', '/')}
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={{ stroke: '#e5e5e5' }}
            tickLine={false}
            dy={8}
          />
          <YAxis
            tickFormatter={formatYAxis}
            tick={{ fontSize: 12, fill: '#999' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<VisitorChartTooltip />} cursor={{ stroke: '#e5e7eb' }} />
          <Area
            type="monotone"
            dataKey="pageViews"
            stroke="#93c5fd"
            fill="url(#dashboardVisitorPageViews)"
            strokeWidth={1.5}
            name="페이지뷰"
          />
          <Line
            type="monotone"
            dataKey="visitors"
            stroke="#2563eb"
            strokeWidth={2.4}
            dot={{ r: 3, fill: '#2563eb' }}
            activeDot={{ r: 5 }}
            name="방문자"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function ConversionFunnel({ data }: { data: AdminAnalyticsFunnel }) {
  const steps = [
    { label: '방문자', detail: 'page_views 세션', value: data.visitors, accent: '#2563eb' },
    { label: '문서스토어/상품 조회', detail: '/store 접속 세션', value: data.storeViews, accent: '#4f46e5' },
    { label: '장바구니 진입', detail: '/cart 접속 세션', value: data.cartViews, accent: '#0284c7' },
    { label: '결제 진입', detail: '/checkout 접속 세션', value: data.checkoutViews, accent: '#f59e0b' },
    { label: '주문 생성', detail: '취소/환불 제외 주문', value: data.orders, accent: '#ea580c' },
    { label: '구매 완료', detail: 'paid/completed 주문', value: data.completed, accent: '#059669' },
  ]
  const max = Math.max(data.visitors, 1)

  return (
    <div className="grid gap-3 lg:grid-cols-6">
      {steps.map((step, index) => {
        const pct = Math.round((step.value / max) * 100)
        const prevValue = index > 0 ? steps[index - 1].value : step.value
        const stepRatio = index > 0 && prevValue > 0 ? Math.round((step.value / prevValue) * 100) : null

        return (
          <div
            key={step.label}
            className="relative overflow-hidden rounded-[18px] border border-[#e6e0d6] bg-[#fcfbf8] p-4"
          >
            <div
              className="absolute inset-x-0 bottom-0 h-1"
              style={{ backgroundColor: step.accent, opacity: 0.85 }}
            />
            <div className="mb-5 flex items-start justify-between gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-[10px] font-mono text-xs font-bold text-white"
                style={{ backgroundColor: step.accent }}
              >
                {index + 1}
              </span>
              <span className="font-mono text-[11px] font-semibold text-[#6b665c]">{pct}%</span>
            </div>
            <p className="text-sm font-semibold text-[#1a1814]">{step.label}</p>
            <p className="mt-1 min-h-8 text-xs text-[#8b8578]">{step.detail}</p>
            <p className="mt-4 font-mono text-[26px] font-bold tracking-[-0.04em] text-[#1a1814]">
              {step.value.toLocaleString()}
            </p>
            {stepRatio !== null && (
              <p className="mt-2 text-xs text-[#6b665c]">전 단계 대비 {stepRatio}%</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ===========================
// Sub-components
// ===========================

function AvatarInitial({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {initial}
    </div>
  )
}

interface ActivityFeedItem {
  id: string
  type: 'order' | 'consulting' | 'review' | 'download'
  title: string
  subtitle: string
  timestamp: string
  href: string
}

function formatRelativeTime(date: string) {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMin < 1) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}시간 전`
  const diffDay = Math.floor(diffHour / 24)
  return `${diffDay}일 전`
}

function DashboardPanel({
  eyebrow,
  title,
  sub,
  href,
  children,
  action,
  className = '',
}: {
  eyebrow: string
  title: string
  sub?: string
  href?: string
  children: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[24px] border border-[#ddd6ca] bg-white/90 p-5 shadow-[0_20px_60px_-42px_rgba(37,99,235,0.35)] backdrop-blur ${className}`}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#2563eb]/35 to-transparent" />
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7b7468]">
            {eyebrow}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1a1814]">
            {title}
          </h2>
          {sub && <p className="mt-1 text-sm text-[#6b665c]">{sub}</p>}
        </div>
        {action ?? (href ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563eb] transition-colors hover:text-[#1d4ed8]"
          >
            전체보기 <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        ) : null)}
      </div>
      {children}
    </section>
  )
}

function DashboardKpiCard({
  label,
  value,
  href,
  icon: IconComponent,
  accent,
  change,
  subtext,
}: {
  label: string
  value: string
  href: string
  icon: typeof Package
  accent: string
  change: number | null
  subtext?: string | null
}) {
  const isPositive = change !== null ? change >= 0 : null
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-[20px] border border-[#ddd6ca] bg-white/95 p-4 shadow-[0_16px_40px_-36px_rgba(37,99,235,0.45)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#cfc6b9] hover:shadow-[0_24px_56px_-34px_rgba(37,99,235,0.30)]"
    >
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-80"
        style={{ background: `linear-gradient(90deg, ${accent} 0%, transparent 100%)` }}
      />
      <div className="mb-5 flex items-start justify-between gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[12px] border"
          style={{
            borderColor: `${accent}44`,
            background: `${accent}16`,
            color: accent,
          }}
        >
          <IconComponent className="h-[18px] w-[18px]" />
        </div>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9c968a]">
          {label}
        </span>
      </div>
      <p className="font-mono text-[26px] font-bold tracking-[-0.04em] text-[#1a1814]">
        {value}
      </p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="min-h-5">
          {change !== null ? (
            <span
              className="inline-flex items-center rounded-full border px-2 py-1 font-mono text-[10px] font-semibold"
              style={{
                color: isPositive ? '#047857' : '#b45309',
                background: isPositive ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.12)',
                borderColor: isPositive ? 'rgba(16,185,129,0.22)' : 'rgba(245,158,11,0.24)',
              }}
            >
              {isPositive ? '+' : ''}{change}%
            </span>
          ) : (
            <span className="text-[11px] text-[#8b8578]">{subtext || '집계 기준 확인'}</span>
          )}
        </div>
        <span className="text-[11px] font-medium text-[#6b665c] transition-colors group-hover:text-[#2563eb]">
          이동
        </span>
      </div>
    </Link>
  )
}

function NotificationIcon({ type }: { type: Notification['type'] | ActivityFeedItem['type'] }) {
  if (type === 'order') {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-emerald-200 bg-emerald-50 text-emerald-700">
        <ShoppingCart className="h-4 w-4" />
      </div>
    )
  }
  if (type === 'consulting') {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-sky-200 bg-sky-50 text-sky-700">
        <MessageSquare className="h-4 w-4" />
      </div>
    )
  }
  if (type === 'review') {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-amber-200 bg-amber-50 text-amber-700">
        <Star className="h-4 w-4" />
      </div>
    )
  }
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-blue-200 bg-blue-50 text-blue-700">
      <Download className="h-4 w-4" />
    </div>
  )
}

// ===========================
// Main component
// ===========================

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<Period>('30일')
  const [kpi, setKPI] = useState<KPI>({
    products: 0,
    orders: 0,
    paidOrders: 0,
    members: 0,
    revenue: 0,
    downloads: 0,
    consulting: 0,
    reviews: 0,
  })
  const [kpiChange, setKpiChange] = useState<KPIChange>({
    orders: null,
    paidOrders: null,
    members: null,
    revenue: null,
    downloads: null,
    consulting: null,
    reviews: null,
  })
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([])
  const [visitorTrend, setVisitorTrend] = useState<AdminAnalyticsDayStat[]>([])
  const [dashboardFunnel, setDashboardFunnel] = useState<AdminAnalyticsFunnel>(EMPTY_FUNNEL)
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
  const [orderProfiles, setOrderProfiles] = useState<ProfileMap>({})
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([])
  const [recentConsulting, setRecentConsulting] = useState<RecentConsulting[]>([])
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([])
  const [reviewProfiles, setReviewProfiles] = useState<ProfileMap>({})
  const [recentDownloads, setRecentDownloads] = useState<RecentDownload[]>([])
  const [downloadProfiles, setDownloadProfiles] = useState<ProfileMap>({})
  const [downloadProducts, setDownloadProducts] = useState<ProductMap>({})

  // 수집 현황
  const [fetchStatus, setFetchStatus] = useState<{ annLogs: Array<{ source: string; count: number; time: string }>; feedLogs: Array<{ source: string; count: number; time: string }> }>({ annLogs: [], feedLogs: [] })

  // Realtime notifications
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const notificationTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const membersCacheRef = useRef<AdminMemberSummary[] | null>(null)

  const addNotification = useCallback(
    (title: string, message: string, type: Notification['type']) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const notification: Notification = { id, type, title, message, timestamp: new Date() }
      setNotifications((prev) => [notification, ...prev].slice(0, 5))

      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        notificationTimers.current.delete(id)
      }, 10000)
      notificationTimers.current.set(id, timer)
    },
    []
  )

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const timer = notificationTimers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      notificationTimers.current.delete(id)
    }
  }, [])

  const fetchAdminMembers = useCallback(async (): Promise<AdminMemberSummary[]> => {
    if (membersCacheRef.current) {
      return membersCacheRef.current
    }

    if (inflightMemberRequest) {
      return inflightMemberRequest
    }

    inflightMemberRequest = (async () => {
      const adminMembersRes = await fetch('/api/admin/members', {
        cache: 'no-store',
        credentials: 'same-origin',
      })

      if (adminMembersRes.ok) {
        const adminMembers = await adminMembersRes.json() as AdminMembersResponse
        membersCacheRef.current = adminMembers.members || []
        return membersCacheRef.current
      }

      return membersCacheRef.current || []
    })()

    try {
      return await inflightMemberRequest
    } finally {
      inflightMemberRequest = null
    }
  }, [])

  // Subscribe to realtime events (orders, consulting, reviews, profiles)
  useEffect(() => {
    const supabase = createClient()
    const timers = notificationTimers.current
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        const orderNumber =
          (payload.new as Record<string, unknown>).order_number as string || '알 수 없음'
        addNotification('새 주문', `주문번호: ${orderNumber}`, 'order')
      })
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'consulting_requests' },
        (payload) => {
          const name =
            (payload.new as Record<string, unknown>).name as string || '알 수 없음'
          addNotification('새 컨설팅 문의', `${name}님의 문의`, 'consulting')
        }
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reviews' }, (payload) => {
        const rating = (payload.new as Record<string, unknown>).rating as number
        addNotification('새 리뷰', `별점 ${rating}점 리뷰가 등록되었습니다`, 'review')
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, (payload) => {
        const email =
          (payload.new as Record<string, unknown>).email as string || '알 수 없음'
        addNotification('새 회원가입', `${email}님이 가입했습니다`, 'member')
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      timers.forEach((timer) => clearTimeout(timer))
    }
  }, [addNotification])

  const loadDashboard = useCallback(async () => {
    const existingLoad = inflightDashboardLoads.get(period)
    if (existingLoad) {
      return existingLoad
    }

    const request = (async () => {
    setLoading(true)
    const supabase = createClient()

    const periodStart = getPeriodStart(period)
    const prevPeriodStart = getPrevPeriodStart(period)
    const days = getAnalyticsDays(period)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()
    const membersPromise = fetchAdminMembers()
    const analyticsPromise = fetch(`/api/admin/analytics/summary?days=${days}`, {
      cache: 'no-store',
      credentials: 'same-origin',
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`통계 API 오류: ${response.status}`)
        }
        return (await response.json()) as AdminAnalyticsSummary
      })
      .catch((error) => {
        console.error('[admin/dashboard] failed to load analytics summary', error)
        return null
      })

    // Build queries with optional date filter
    function applyPeriod<T extends DateFilteredQuery<T>>(q: T, col: string = 'created_at'): T {
      return periodStart ? q.gte(col, periodStart) : q
    }
    function applyPrevPeriod<T extends DateFilteredQuery<T>>(q: T, col: string = 'created_at'): T {
      if (!prevPeriodStart || !periodStart) return q
      return q.gte(col, prevPeriodStart).lt(col, periodStart)
    }

    // Current period queries
    const ordersQ = supabase.from('orders').select('id', { count: 'exact', head: true })
    const paidOrdersQ = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'completed'])
    const consultingQ = supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
    const reviewsQ = supabase.from('reviews').select('id', { count: 'exact', head: true })
    const downloadsQ = supabase.from('download_logs').select('id', { count: 'exact', head: true })
    // Supabase 기본 1000행 제한 회피 — 전체 집계가 필요하므로 명시적 range
    const paidAmountQ = supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['paid', 'completed'])
      .range(0, 99999)

    const [
      allMembers,
      analyticsSummary,
      productsCount,
      ordersCount,
      paidOrdersCount,
      consultingCount,
      reviewsCount,
      downloadsCount,
      paidOrdersData,
      recentOrdersData,
      topProductsData,
      recentConsultingData,
      recentReviewsData,
      recentDownloadsData,
      annLogResult,
      feedLogResult,
    ] = await Promise.all([
      membersPromise,
      analyticsPromise,
      supabase.from('products').select('id', { count: 'exact', head: true }),
      applyPeriod(ordersQ),
      applyPeriod(paidOrdersQ),
      applyPeriod(consultingQ),
      applyPeriod(reviewsQ),
      applyPeriod(downloadsQ, 'downloaded_at'),
      applyPeriod(paidAmountQ),
      supabase
        .from('orders')
        .select('id, order_number, user_id, total_amount, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('products')
        .select('id, title, download_count, price')
        .order('download_count', { ascending: false })
        .limit(5),
      supabase
        .from('consulting_requests')
        .select('id, name, package_type, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('reviews')
        .select('id, rating, user_id, product_id, created_at, products(title)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('download_logs')
        .select('id, user_id, product_id, downloaded_at')
        .order('downloaded_at', { ascending: false })
        .limit(5),
      supabase
        .from('announcement_logs')
        .select('source, created_at')
        .eq('action', 'collected')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false }),
      supabase
        .from('feed_logs')
        .select('source_name, created_at')
        .eq('action', 'collected')
        .gte('created_at', todayISO)
        .order('created_at', { ascending: false }),
    ])

    // 기간별 회원 카운트 계산 (API 결과에서)
    const periodStartMs = periodStart ? new Date(periodStart).getTime() : null
    const membersInPeriod = periodStartMs !== null
      ? allMembers.filter(m => new Date(m.created_at).getTime() >= periodStartMs).length
      : allMembers.length

    // Recent 5 members from API result
    const recentMembersData = {
      data: allMembers
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
      error: null,
    }
    const membersCount = { count: membersInPeriod }

    // Previous period queries (for change %)
    let prevKpi = {
      orders: 0,
      paidOrders: 0,
      members: 0,
      revenue: 0,
      downloads: 0,
      consulting: 0,
      reviews: 0,
    }

    if (period !== '전체' && prevPeriodStart && periodStart) {
      const [
        prevOrdersCount,
        prevPaidOrdersCount,
        prevConsultingCount,
        prevReviewsCount,
        prevDownloadsCount,
        prevPaidAmountData,
      ] = await Promise.all([
        applyPrevPeriod(
          supabase.from('orders').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .in('status', ['paid', 'completed'])
        ),
        applyPrevPeriod(
          supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase.from('reviews').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase.from('download_logs').select('id', { count: 'exact', head: true }),
          'downloaded_at'
        ),
        applyPrevPeriod(
          supabase
            .from('orders')
            .select('total_amount')
            .in('status', ['paid', 'completed'])
        ),
      ])

      // 이전 기간 회원 수 (API 결과에서 필터링)
      const prevStartMs = new Date(prevPeriodStart).getTime()
      const curStartMs = new Date(periodStart).getTime()
      const prevMembersCount = allMembers.filter(m => {
        const t = new Date(m.created_at).getTime()
        return t >= prevStartMs && t < curStartMs
      }).length

      prevKpi = {
        orders: prevOrdersCount.count || 0,
        paidOrders: prevPaidOrdersCount.count || 0,
        members: prevMembersCount,
        revenue:
          prevPaidAmountData.data?.reduce((s: number, o: { total_amount?: number }) => s + (o.total_amount || 0), 0) || 0,
        downloads: prevDownloadsCount.count || 0,
        consulting: prevConsultingCount.count || 0,
        reviews: prevReviewsCount.count || 0,
      }
    }

    // KPIs
    const revenue =
      paidOrdersData.data?.reduce((sum: number, o: { total_amount?: number }) => sum + (o.total_amount || 0), 0) || 0
    const currentKpi = {
      products: productsCount.count || 0,
      orders: ordersCount.count || 0,
      paidOrders: paidOrdersCount.count || 0,
      members: membersCount.count || 0,
      revenue,
      downloads: downloadsCount.count || 0,
      consulting: consultingCount.count || 0,
      reviews: reviewsCount.count || 0,
    }
    setKPI(currentKpi)

    // Change percentages
    if (period === '전체') {
      setKpiChange({
        orders: null,
        paidOrders: null,
        members: null,
        revenue: null,
        downloads: null,
        consulting: null,
        reviews: null,
      })
    } else {
      setKpiChange({
        orders: calcChange(currentKpi.orders, prevKpi.orders),
        paidOrders: calcChange(currentKpi.paidOrders, prevKpi.paidOrders),
        members: calcChange(currentKpi.members, prevKpi.members),
        revenue: calcChange(currentKpi.revenue, prevKpi.revenue),
        downloads: calcChange(currentKpi.downloads, prevKpi.downloads),
        consulting: calcChange(currentKpi.consulting, prevKpi.consulting),
        reviews: calcChange(currentKpi.reviews, prevKpi.reviews),
      })
    }

    // Build revenue chart data
    if (paidOrdersData.data) {
      if (period !== '전체') {
        // Daily aggregation for specific periods
        const dayMap: Record<string, number> = {}
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          const key = d.toISOString().slice(0, 10)
          dayMap[key] = 0
        }
        for (const o of paidOrdersData.data) {
          const key = o.created_at?.slice(0, 10)
          if (key && key in dayMap) dayMap[key] += o.total_amount || 0
        }
        setDailyRevenue(
          Object.entries(dayMap).map(([date, rev]) => ({ date, revenue: rev }))
        )
      } else {
        // Monthly aggregation for "전체" period
        const monthMap: Record<string, number> = {}
        for (const o of paidOrdersData.data) {
          const key = o.created_at?.slice(0, 7) // YYYY-MM
          if (key) monthMap[key] = (monthMap[key] || 0) + (o.total_amount || 0)
        }
        const sorted = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b))
        setDailyRevenue(
          sorted.map(([date, rev]) => ({ date, revenue: rev }))
        )
      }
    } else {
      setDailyRevenue([])
    }

    if (analyticsSummary) {
      setVisitorTrend(analyticsSummary.dailyStats)
      setDashboardFunnel(analyticsSummary.funnelData)
      if (period !== '전체') {
        setDailyRevenue(
          analyticsSummary.dailyStats.map((item) => ({
            date: item.date,
            revenue: item.revenue,
          }))
        )
      }
    } else {
      setVisitorTrend([])
      setDashboardFunnel(EMPTY_FUNNEL)
    }

    // Recent data
    const orders = (recentOrdersData.data || []) as RecentOrder[]
    setRecentOrders(orders)
    setTopProducts((topProductsData.data || []) as TopProduct[])
    setRecentMembers((recentMembersData.data || []) as RecentMember[])
    setRecentConsulting((recentConsultingData.data || []) as RecentConsulting[])
    setRecentReviews((recentReviewsData.data || []) as RecentReview[])
    const downloads = (recentDownloadsData.data || []) as RecentDownload[]
    setRecentDownloads(downloads)

    // Fetch profiles for orders, reviews, downloads
    const orderUserIds = [...new Set(orders.map((o) => o.user_id).filter(Boolean))]
    const reviewUserIds = [
      ...new Set(
        (recentReviewsData.data || []).map((r: RecentReview) => r.user_id).filter(Boolean)
      ),
    ]
    const downloadUserIds = [...new Set(downloads.map((d) => d.user_id).filter(Boolean))]
    const allUserIds = [...new Set([...orderUserIds, ...reviewUserIds, ...downloadUserIds])]

    if (allUserIds.length > 0) {
      // allMembers already has everyone; build map from it (bypasses RLS)
      const map: ProfileMap = {}
      for (const m of allMembers) {
        if (allUserIds.includes(m.id)) {
          map[m.id] = { name: m.name || '-', email: m.email || '-' }
        }
      }
      setOrderProfiles(map)
      setReviewProfiles(map)
      setDownloadProfiles(map)
    }

    // Fetch product names for downloads
    const downloadProductIds = [
      ...new Set(downloads.map((d) => d.product_id).filter(Boolean)),
    ]
    if (downloadProductIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .in('id', downloadProductIds)

      const map: ProductMap = {}
      if (products) {
        for (const p of products) {
          map[p.id] = p.title
        }
      }
      setDownloadProducts(map)
    }

    const annLogData = annLogResult.data
    const feedLogData = feedLogResult.data

    if (annLogData) {
      const sourceMap: Record<string, { count: number; time: string }> = {}
      for (const log of annLogData) {
        const src = log.source || 'K-Startup'
        if (!sourceMap[src]) sourceMap[src] = { count: 0, time: log.created_at }
        sourceMap[src].count++
      }
      setFetchStatus(prev => ({ ...prev, annLogs: Object.entries(sourceMap).map(([source, v]) => ({ source, count: v.count, time: v.time })) }))
    }

    if (feedLogData) {
      const sourceMap: Record<string, { count: number; time: string }> = {}
      for (const log of feedLogData) {
        const src = log.source_name || 'RSS'
        if (!sourceMap[src]) sourceMap[src] = { count: 0, time: log.created_at }
        sourceMap[src].count++
      }
      setFetchStatus(prev => ({ ...prev, feedLogs: Object.entries(sourceMap).map(([source, v]) => ({ source, count: v.count, time: v.time })) }))
    }

    setLoading(false)
    })().finally(() => {
      inflightDashboardLoads.delete(period)
    })

    inflightDashboardLoads.set(period, request)
    return request
  }, [fetchAdminMembers, period])

  useEffect(() => {
    const runId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(runId)
  }, [loadDashboard])

  // ===========================
  // KPI card definitions
  // ===========================

  const todayAnnCount = fetchStatus.annLogs.reduce((s, l) => s + l.count, 0)
  const todayFeedCount = fetchStatus.feedLogs.reduce((s, l) => s + l.count, 0)
  const todayAnnTime = fetchStatus.annLogs.length > 0 ? new Date(fetchStatus.annLogs[0].time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'
  const todayFeedTime = fetchStatus.feedLogs.length > 0 ? new Date(fetchStatus.feedLogs[0].time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '-'

  const kpiRow1 = [
    {
      icon: Package,
      label: '등록상품',
      value: `${kpi.products}개`,
      color: 'bg-primary',
      href: '/admin/products',
      emphasis: false,
      change: null,
      subtext: null,
    },
    {
      icon: ShoppingCart,
      label: '총 주문',
      value: `${kpi.orders}건`,
      color: 'bg-primary',
      href: '/admin/orders',
      emphasis: false,
      change: kpiChange.orders,
      subtext: null,
    },
    {
      icon: CreditCard,
      label: '결제완료',
      value: `${kpi.paidOrders}건`,
      color: 'bg-primary',
      href: '/admin/orders',
      emphasis: true,
      change: kpiChange.paidOrders,
      subtext: null,
    },
    {
      icon: Users,
      label: '가입회원',
      value: `${kpi.members}명`,
      color: 'bg-primary',
      href: '/admin/members',
      emphasis: false,
      change: kpiChange.members,
      subtext: null,
    },
    {
      icon: Megaphone,
      label: '오늘 배포 공고',
      value: `${todayAnnCount}건`,
      color: 'bg-blue-600',
      href: '/admin/announcements',
      emphasis: false,
      change: null,
      subtext: todayAnnCount > 0 ? `${todayAnnTime} 수집` : null,
    },
  ]

  const kpiRow2 = [
    {
      icon: TrendingUp,
      label: '총 매출',
      value: `${formatAmount(kpi.revenue)}원`,
      color: 'bg-primary',
      href: '/admin/orders',
      emphasis: true,
      change: kpiChange.revenue,
      subtext: null,
    },
    {
      icon: Download,
      label: '총 다운로드',
      value: `${kpi.downloads}건`,
      color: 'bg-primary',
      href: '/admin/downloads',
      emphasis: false,
      change: kpiChange.downloads,
      subtext: null,
    },
    {
      icon: MessageSquare,
      label: '컨설팅신청',
      value: `${kpi.consulting}건`,
      color: 'bg-primary',
      href: '/admin/consulting',
      emphasis: false,
      change: kpiChange.consulting,
      subtext: null,
    },
    {
      icon: Star,
      label: '리뷰',
      value: `${kpi.reviews}건`,
      color: 'bg-primary',
      href: '/admin/reviews',
      emphasis: false,
      change: kpiChange.reviews,
      subtext: null,
    },
    {
      icon: Rss,
      label: '오늘 배포 피드',
      value: `${todayFeedCount}건`,
      color: 'bg-orange-500',
      href: '/admin/feeds',
      emphasis: false,
      change: null,
      subtext: todayFeedCount > 0 ? `${todayFeedTime} 수집` : null,
    },
  ]

  const activityFeed = useMemo<ActivityFeedItem[]>(() => {
    const orderItems = recentOrders.map((order) => {
      const profile = orderProfiles[order.user_id]
      const status = statusLabels[order.status]?.label || order.status
      return {
        id: `order-${order.id}`,
        type: 'order' as const,
        title: `${order.order_number} ${status}`,
        subtitle: `${profile?.name || '이름 없음'} · ${formatAmount(order.total_amount)}원`,
        timestamp: order.created_at,
        href: `/admin/orders?search=${encodeURIComponent(order.order_number)}`,
      }
    })

    const consultingItems = recentConsulting.map((item) => ({
      id: `consulting-${item.id}`,
      type: 'consulting' as const,
      title: `${item.name} 컨설팅 신청`,
      subtitle: `${packageLabels[item.package_type] || item.package_type} · ${consultingStatusLabels[item.status]?.label || item.status}`,
      timestamp: item.created_at,
      href: '/admin/consulting',
    }))

    const reviewItems = recentReviews.map((review) => {
      const profile = reviewProfiles[review.user_id]
      const prod = review.products
      const productTitle = Array.isArray(prod) ? prod[0]?.title || '-' : prod?.title || '-'
      return {
        id: `review-${review.id}`,
        type: 'review' as const,
        title: `${review.rating}점 리뷰 등록`,
        subtitle: `${profile?.name || '이름 없음'} · ${productTitle}`,
        timestamp: review.created_at,
        href: '/admin/reviews',
      }
    })

    const downloadItems = recentDownloads.map((download) => {
      const profile = downloadProfiles[download.user_id]
      return {
        id: `download-${download.id}`,
        type: 'download' as const,
        title: downloadProducts[download.product_id] || '다운로드',
        subtitle: `${profile?.name || '이름 없음'} · 문서 다운로드`,
        timestamp: download.downloaded_at,
        href: '/admin/downloads',
      }
    })

    return [...orderItems, ...consultingItems, ...reviewItems, ...downloadItems]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)
  }, [
    recentOrders,
    orderProfiles,
    recentConsulting,
    recentReviews,
    reviewProfiles,
    recentDownloads,
    downloadProfiles,
    downloadProducts,
  ])

  return (
    <>
      <div className="relative overflow-hidden rounded-[28px] border border-[#ddd6ca] bg-[#faf9f7] shadow-[0_30px_80px_-54px_rgba(37,99,235,0.45)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_38%)]" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(37,99,235,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,235,0.35)_1px,transparent_1px)] [background-size:46px_46px]" />

        <div className="relative space-y-6 p-4 md:p-8">
          <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7b7468]">
                operations / dashboard
              </p>
              <h1 className="mt-2 text-[30px] font-semibold tracking-[-0.04em] text-[#1a1814] md:text-[36px]">
                프리세일즈 관리자 대시보드
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#6b665c]">
                <span>
                  {new Date().toLocaleDateString('ko-KR', {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                  })}
                </span>
                <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#7b7468]">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                  system online
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/products/new"
                className="inline-flex items-center gap-2 rounded-[12px] bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_-16px_rgba(37,99,235,0.7)] transition-all hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
              >
                <PlusCircle className="h-4 w-4" />
                새 상품 등록
              </Link>
              <Link
                href="/admin/orders"
                className="inline-flex items-center gap-2 rounded-[12px] border border-[#d7d0c4] bg-white px-4 py-2.5 text-sm font-medium text-[#3d3a35] transition-colors hover:border-[#c8beb0] hover:bg-[#f3efe8]"
              >
                <AlertCircle className="h-4 w-4 text-amber-600" />
                주문 관리
              </Link>
              <button
                type="button"
                onClick={() => setShowNotifications(true)}
                className="relative inline-flex h-11 w-11 items-center justify-center rounded-[12px] border border-[#d7d0c4] bg-white text-[#3d3a35] transition-colors hover:border-[#c8beb0] hover:bg-[#f3efe8]"
                aria-label="실시간 알림 열기"
              >
                <Bell className="h-4.5 w-4.5" />
                {notifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#1e40af] px-1 text-[10px] font-bold text-white">
                    {notifications.length}
                  </span>
                )}
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">
                기간
              </span>
              <div className="inline-flex flex-wrap items-center gap-1 rounded-[14px] border border-[#ddd6ca] bg-white/90 p-1">
                {PERIODS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors ${
                      period === p
                        ? 'bg-[#2563eb] text-white shadow-[0_8px_18px_-12px_rgba(37,99,235,0.75)]'
                        : 'text-[#6b665c] hover:text-[#1a1814]'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[#7b7468]">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
              실시간 동기화
            </div>
          </div>

          {loading ? (
            <KPISkeleton />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {[...kpiRow1, ...kpiRow2].map((card) => (
                <DashboardKpiCard
                  key={card.label}
                  label={card.label}
                  value={card.value}
                  href={card.href}
                  icon={card.icon}
                  accent={
                    card.label.includes('매출') ? '#1e40af'
                      : card.label.includes('공고') ? '#0891b2'
                      : card.label.includes('피드') ? '#60a5fa'
                      : card.label.includes('다운로드') ? '#10b981'
                      : '#2563eb'
                  }
                  change={card.change}
                  subtext={card.subtext || (period === '전체' ? '전체 기간' : `최근 ${period}`)}
                />
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            <DashboardPanel
              eyebrow="revenue stream"
              title="매출 추이"
              sub={period === '전체' ? '전체 기간 월별 · 결제 완료 기준' : `최근 ${period} · 결제 완료 기준`}
              href="/admin/analytics"
            >
              {loading ? (
                <div className="h-[340px] animate-pulse rounded-[18px] bg-[#f1ede6]" />
              ) : dailyRevenue.length === 0 ? (
                <div className="flex h-[340px] items-center justify-center text-sm text-[#8b8578]">
                  매출 데이터가 없습니다
                </div>
              ) : (
                <RevenueChart data={dailyRevenue} period={period} />
              )}
            </DashboardPanel>

            <DashboardPanel
              eyebrow="traffic"
              title="방문자 추이"
              sub={`${period === '전체' ? '최근 90일' : `최근 ${period}`} · 실제 page_views 기준`}
              href="/admin/analytics"
            >
              {loading ? (
                <div className="h-[340px] animate-pulse rounded-[18px] bg-[#f1ede6]" />
              ) : (
                <VisitorTrendChart data={visitorTrend} />
              )}
            </DashboardPanel>
          </div>

          <DashboardPanel
            eyebrow="conversion funnel"
            title="전환 퍼널"
            sub={`${period === '전체' ? '최근 90일' : `최근 ${period}`} · 방문자에서 구매 완료까지 실제 로그 기준`}
            href="/admin/analytics"
          >
            {loading ? (
              <div className="h-[180px] animate-pulse rounded-[18px] bg-[#f1ede6]" />
            ) : (
              <ConversionFunnel data={dashboardFunnel} />
            )}
          </DashboardPanel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,1fr)]">
            <DashboardPanel eyebrow="recent orders" title="최근 주문" sub="최신 결제 트랜잭션" href="/admin/orders">
              {loading ? (
                <TableSkeleton />
              ) : recentOrders.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#8b8578]">주문이 없습니다</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-[#ece6dc] text-left text-[11px] uppercase tracking-[0.16em] text-[#8b8578]">
                        <th className="px-2 py-3 font-mono font-semibold">주문번호</th>
                        <th className="px-2 py-3 font-mono font-semibold">주문자</th>
                        <th className="px-2 py-3 text-right font-mono font-semibold">금액</th>
                        <th className="px-2 py-3 text-center font-mono font-semibold">상태</th>
                        <th className="px-2 py-3 text-right font-mono font-semibold">일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => {
                        const profile = orderProfiles[order.user_id]
                        const status = statusLabels[order.status] || { label: order.status, variant: 'outline' as const }
                        return (
                          <tr
                            key={order.id}
                            onClick={() => router.push(`/admin/orders?search=${encodeURIComponent(order.order_number)}`)}
                            className="cursor-pointer border-b border-[#f1ece4] text-[#3d3a35] transition-colors hover:bg-[#fbf8f3]"
                          >
                            <td className="px-2 py-4 font-mono text-[12px] font-semibold text-[#1e40af]">{order.order_number}</td>
                            <td className="px-2 py-4">{profile?.name || '-'}</td>
                            <td className="px-2 py-4 text-right font-mono font-semibold text-[#1a1814]">{formatAmount(order.total_amount)}원</td>
                            <td className="px-2 py-4 text-center">
                              <Badge variant={status.variant} className="text-[11px]">{status.label}</Badge>
                            </td>
                            <td className="px-2 py-4 text-right font-mono text-[11px] text-[#8b8578]">{formatDateTime(order.created_at)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel eyebrow="top 5" title="인기 상품" sub="다운로드 수 기준" href="/admin/products">
              {loading ? (
                <ListSkeleton rows={5} />
              ) : topProducts.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#8b8578]">상품이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {topProducts.map((product, index) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => router.push(`/admin/products/${product.id}`)}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-1 py-2 text-left transition-colors hover:border-[#e6e0d6] hover:bg-[#fcfbf8]"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[12px] border border-blue-200 bg-blue-50 font-mono text-sm font-bold text-[#1e40af]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1a1814]">{product.title}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8578]">
                          {formatPrice(product.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-sm font-semibold text-[#1a1814]">{formatAmount(product.download_count)}</p>
                        <p className="text-[11px] text-[#6b665c]">downloads</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </DashboardPanel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <DashboardPanel eyebrow="new members" title="최근 가입 회원" href="/admin/members">
              {loading ? (
                <ListSkeleton rows={5} />
              ) : recentMembers.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#8b8578]">회원이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {recentMembers.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => router.push(`/admin/members?search=${encodeURIComponent(member.email)}`)}
                      className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-1 py-2 text-left transition-colors hover:border-[#e6e0d6] hover:bg-[#fcfbf8]"
                    >
                      <AvatarInitial name={member.name || member.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[#1a1814]">{member.name || '-'}</p>
                        <p className="truncate text-xs text-[#6b665c]">{member.email}</p>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8578]">
                        {formatDate(member.created_at)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel eyebrow="consulting" title="최근 컨설팅 신청" href="/admin/consulting">
              {loading ? (
                <ListSkeleton rows={5} />
              ) : recentConsulting.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#8b8578]">신청이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {recentConsulting.map((item) => {
                    const status = consultingStatusLabels[item.status] || { label: item.status, variant: 'outline' as const }
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => router.push('/admin/consulting')}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-1 py-2 text-left transition-colors hover:border-[#e6e0d6] hover:bg-[#fcfbf8]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#1a1814]">{item.name}</p>
                          <p className="mt-1 text-xs text-[#6b665c]">{packageLabels[item.package_type] || item.package_type}</p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8578]">{formatDate(item.created_at)}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel eyebrow="downloads" title="최근 다운로드" href="/admin/downloads">
              {loading ? (
                <ListSkeleton rows={5} />
              ) : recentDownloads.length === 0 ? (
                <p className="py-4 text-center text-sm text-[#8b8578]">다운로드 기록이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {recentDownloads.map((download) => {
                    const profile = downloadProfiles[download.user_id]
                    const productTitle = downloadProducts[download.product_id] || '-'
                    return (
                      <button
                        key={download.id}
                        type="button"
                        onClick={() => router.push('/admin/downloads')}
                        className="flex w-full items-center gap-3 rounded-[16px] border border-transparent px-1 py-2 text-left transition-colors hover:border-[#e6e0d6] hover:bg-[#fcfbf8]"
                      >
                        <NotificationIcon type="download" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#1a1814]">{productTitle}</p>
                          <p className="truncate text-xs text-[#6b665c]">{profile?.name || '-'}</p>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8578]">
                          {formatDate(download.downloaded_at)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </DashboardPanel>
          </div>

          <DashboardPanel eyebrow="activity" title="실시간 활동" sub="주문·컨설팅·리뷰·다운로드 최근 기록">
            {loading ? (
              <ListSkeleton rows={5} />
            ) : activityFeed.length === 0 ? (
              <p className="py-4 text-center text-sm text-[#8b8578]">활동 기록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {activityFeed.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => router.push(item.href)}
                    className="flex w-full items-start gap-3 rounded-[16px] border border-transparent px-1 py-1 text-left transition-colors hover:border-[#e6e0d6] hover:bg-[#fcfbf8]"
                  >
                    <NotificationIcon type={item.type} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1a1814]">{item.title}</p>
                      <p className="mt-1 text-xs text-[#6b665c]">{item.subtitle}</p>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[#8b8578]">
                      {formatRelativeTime(item.timestamp)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DashboardPanel>
        </div>
      </div>

      {showNotifications && (
        <>
          <button
            type="button"
            aria-label="알림 패널 닫기"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setShowNotifications(false)}
          />
          <aside className="fixed right-0 top-0 z-50 flex h-[100dvh] w-full max-w-[420px] flex-col border-l border-[#ddd6ca] bg-[#f7f4ee] shadow-[-20px_0_60px_-36px_rgba(20,15,10,0.35)]">
            <div className="flex items-start justify-between border-b border-[#e7e0d4] px-5 py-5">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7b7468]">
                  real-time alerts
                </p>
                <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#1a1814]">
                  실시간 알림
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowNotifications(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] border border-[#d7d0c4] bg-white text-[#3d3a35] transition-colors hover:bg-[#f3efe8]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              {notifications.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[#8b8578]">
                  새 알림이 없습니다
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="rounded-[18px] border border-[#ddd6ca] bg-white/95 p-4 shadow-[0_18px_34px_-30px_rgba(37,99,235,0.35)]"
                    >
                      <div className="flex items-start gap-3">
                        <NotificationIcon type={notification.type} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-[#1a1814]">{notification.title}</p>
                              <p className="mt-1 text-xs text-[#6b665c]">{notification.message}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => dismissNotification(notification.id)}
                              className="rounded-md p-1 text-[#8b8578] transition-colors hover:bg-[#f3efe8] hover:text-[#1a1814]"
                              title="알림 닫기"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#8b8578]">
                            {notification.timestamp.toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </>
      )}
    </>
  )
}
