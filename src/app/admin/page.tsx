'use client'

import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/types'
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

// ===========================
// Constants
// ===========================

const PERIODS: Period[] = ['7일', '30일', '90일', '전체']

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

function calcChange(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? null : 0
  return Math.round(((current - previous) / previous) * 100)
}

function ChangeLabel({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <p className="text-xs text-muted-foreground mt-1">이전 기간 없음</p>
  const positive = pct >= 0
  return (
    <p className={`text-xs mt-1 font-medium ${positive ? 'text-primary' : 'text-red-500'}`}>
      {positive ? '+' : ''}{pct}% vs {label}
    </p>
  )
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
// Revenue Bar Chart (Recharts)
// ===========================

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function RevenueChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string }>; label?: string }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-white border border-zinc-200 px-4 py-3 rounded-lg shadow-lg text-sm">
      <p className="font-bold text-zinc-800 mb-1.5">{String(label).replace(/-/g, '.')}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-sm inline-block ${p.dataKey === 'revenue' ? 'bg-emerald-400' : 'bg-zinc-300'}`} />
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
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-400 inline-block" /> 주문 완료</span>
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

// ===========================
// Sub-components
// ===========================

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      <Link href={href} className="text-xs text-primary hover:text-primary/80 flex items-center gap-0.5 font-medium">
        전체보기 <ArrowUpRight className="w-3 h-3" />
      </Link>
    </div>
  )
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-primary fill-primary' : 'text-border'}`}
        />
      ))}
    </div>
  )
}

function AvatarInitial({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
      {initial}
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

  // Subscribe to realtime events (orders, consulting, reviews, profiles)
  useEffect(() => {
    const supabase = createClient()
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
      notificationTimers.current.forEach((timer) => clearTimeout(timer))
    }
  }, [addNotification])

  useEffect(() => {
    loadDashboard()
  }, [period])

  async function loadDashboard() {
    setLoading(true)
    const supabase = createClient()

    const periodStart = getPeriodStart(period)
    const prevPeriodStart = getPrevPeriodStart(period)
    const days = period === '7일' ? 7 : period === '30일' ? 30 : 90

    // Build queries with optional date filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyPeriod(q: any, col: string = 'created_at') {
      return periodStart ? q.gte(col, periodStart) : q
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyPrevPeriod(q: any, col: string = 'created_at') {
      if (!prevPeriodStart || !periodStart) return q
      return q.gte(col, prevPeriodStart).lt(col, periodStart)
    }

    // 회원 전체 데이터 (RLS 우회 API)
    const adminMembersRes = await fetch('/api/admin/members', { cache: 'no-store' })
    const adminMembers = adminMembersRes.ok
      ? (await adminMembersRes.json() as { members: Array<{ id: string; name: string | null; email: string; created_at: string }> })
      : { members: [] }
    const allMembers = adminMembers.members || []

    // Current period queries
    const ordersQ = supabase.from('orders').select('id', { count: 'exact', head: true })
    const paidOrdersQ = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'completed'])
    const consultingQ = supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
    const reviewsQ = supabase.from('reviews').select('id', { count: 'exact', head: true })
    const downloadsQ = supabase.from('download_logs').select('id', { count: 'exact', head: true })
    const paidAmountQ = supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['paid', 'completed'])

    // 기간별 회원 카운트 계산 (API 결과에서)
    const periodStartMs = periodStart ? new Date(periodStart).getTime() : null
    const membersInPeriod = periodStartMs !== null
      ? allMembers.filter(m => new Date(m.created_at).getTime() >= periodStartMs).length
      : allMembers.length

    const [
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
    ] = await Promise.all([
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
    ])

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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          prevPaidAmountData.data?.reduce((s: number, o: { total_amount?: number }) => s + (o.total_amount || 0), 0) || 0,
        downloads: prevDownloadsCount.count || 0,
        consulting: prevConsultingCount.count || 0,
        reviews: prevReviewsCount.count || 0,
      }
    }

    // KPIs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revenue =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // 오늘 수집 현황 (announcement_logs + feed_logs)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayISO = todayStart.toISOString()

    const [{ data: annLogData }, { data: feedLogData }] = await Promise.all([
      supabase.from('announcement_logs').select('source, created_at').eq('action', 'collected').gte('created_at', todayISO).order('created_at', { ascending: false }),
      supabase.from('feed_logs').select('source_name, created_at').eq('action', 'collected').gte('created_at', todayISO).order('created_at', { ascending: false }),
    ])

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
  }

  // ===========================
  // KPI card definitions
  // ===========================

  const prevLabel =
    period === '전체' ? '' : `이전 ${period}`

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

  // ===========================
  // Notification icon helper
  // ===========================

  function NotificationIcon({ type }: { type: Notification['type'] }) {
    const configs = {
      order: { bg: 'bg-primary/10', icon: <ShoppingCart className="w-4 h-4 text-primary" /> },
      consulting: { bg: 'bg-amber-50', icon: <MessageSquare className="w-4 h-4 text-amber-600" /> },
      review: { bg: 'bg-primary/10', icon: <Star className="w-4 h-4 text-primary" /> },
      member: { bg: 'bg-primary/10', icon: <Users className="w-4 h-4 text-primary" /> },
    }
    const { bg, icon } = configs[type]
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${bg}`}>
        {icon}
      </div>
    )
  }

  // ===========================
  // Render
  // ===========================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">관리자 대시보드</h1>

        <div className="flex items-center gap-2">
          {/* Quick actions */}
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            새 상품 등록
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 px-4 py-2 bg-card border border-border/50 text-foreground text-sm font-medium rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            <AlertCircle className="w-4 h-4 text-amber-600" />
            미처리 주문
          </Link>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl hover:bg-muted transition-colors cursor-pointer"
              aria-label="알림"
            >
              <Bell className="w-5 h-5 text-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card rounded-2xl border border-border/50 shadow-sm z-50">
                <div className="p-4 border-b border-border/50">
                  <p className="text-sm font-semibold text-foreground">실시간 알림</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">새 알림이 없습니다</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-border/50">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-muted/50 flex items-start gap-3">
                        <NotificationIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {n.timestamp.toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            dismissNotification(n.id)
                          }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                          title="알림 닫기"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">기간</span>
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                period === p
                  ? 'bg-card text-foreground border border-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards — 5 columns x 2 rows */}
      {loading ? (
        <KPISkeleton />
      ) : (
        <div className="space-y-4">
          {[kpiRow1, kpiRow2].map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {row.map((card) => (
                <Link
                  key={card.label}
                  href={card.href}
                  className="rounded-2xl p-5 border border-border/50 bg-card transition-all group cursor-pointer hover:border-primary hover:ring-2 hover:ring-primary/30 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-9 h-9 rounded-xl ${card.color} flex items-center justify-center`}>
                      <card.icon className="w-4.5 h-4.5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground leading-tight">{card.label}</span>
                  </div>
                  <p className="text-xl font-bold font-mono text-foreground">{card.value}</p>
                  {card.subtext ? (
                    <p className="text-[10px] text-muted-foreground mt-1.5">{card.subtext}</p>
                  ) : card.change !== undefined && card.change !== null ? (
                    <ChangeLabel pct={card.change} label={prevLabel} />
                  ) : (
                    <p className="text-[10px] text-muted-foreground mt-1.5">{period === '전체' ? '전체 기간' : `최근 ${period}`}</p>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Revenue chart */}
      {!loading && dailyRevenue.length > 0 && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 md:p-8">
          <div className="mb-2">
            <h2 className="text-base font-bold text-foreground">
              매출 추이
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {period === '전체' ? '전체 기간 월별' : `최근 ${period}`} · 결제완료 기준
            </p>
          </div>
          <RevenueChart data={dailyRevenue} period={period} />
        </div>
      )}

      {/* 오늘 수집 현황 */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 공고 수집 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Megaphone className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">오늘 공고 수집</h3>
                  <p className="text-[10px] text-muted-foreground">자동 수집 현황</p>
                </div>
              </div>
              <Link href="/admin/announcements" className="text-xs text-primary hover:underline">관리</Link>
            </div>
            {fetchStatus.annLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">오늘 수집 내역이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {fetchStatus.annLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{log.source}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(log.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{log.count}건 공개</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">합계</span>
                  <span className="text-sm font-bold text-primary">{fetchStatus.annLogs.reduce((s, l) => s + l.count, 0)}건</span>
                </div>
              </div>
            )}
          </div>

          {/* IT피드 수집 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <Rss className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold">오늘 IT피드 수집</h3>
                  <p className="text-[10px] text-muted-foreground">자동 수집 현황</p>
                </div>
              </div>
              <Link href="/admin/feeds" className="text-xs text-primary hover:underline">관리</Link>
            </div>
            {fetchStatus.feedLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 text-center">오늘 수집 내역이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {fetchStatus.feedLogs.map((log, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                    <div>
                      <span className="text-sm font-medium">{log.source}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {new Date(log.time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <Badge className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">{log.count}건 공개</Badge>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-xs text-muted-foreground">합계</span>
                  <span className="text-sm font-bold text-primary">{fetchStatus.feedLogs.reduce((s, l) => s + l.count, 0)}건</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* 최근 주문 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="최근 주문" href="/admin/orders" />
            {loading ? (
              <TableSkeleton />
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">주문이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-left py-3 font-medium">주문번호</th>
                      <th className="text-left py-3 font-medium">주문자</th>
                      <th className="text-right py-3 font-medium">금액</th>
                      <th className="text-center py-3 font-medium">상태</th>
                      <th className="text-right py-3 font-medium">일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const profile = orderProfiles[order.user_id]
                      const status =
                        statusLabels[order.status] || { label: order.status, variant: 'outline' as const }
                      return (
                        <tr
                          key={order.id}
                          onClick={() => router.push(`/admin/orders?search=${encodeURIComponent(order.order_number)}`)}
                          className="border-b border-border/50 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 text-foreground font-mono text-xs">{order.order_number}</td>
                          <td className="py-3 text-foreground">{profile?.name || '-'}</td>
                          <td className="py-3 text-right text-foreground font-medium">
                            {formatAmount(order.total_amount)}원
                          </td>
                          <td className="py-3 text-center">
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-3 text-right text-muted-foreground text-xs">
                            {formatDateTime(order.created_at)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 인기 상품 TOP 5 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="인기 상품 TOP 5" href="/admin/products" />
            {loading ? (
              <TableSkeleton />
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">상품이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="text-center py-3 font-medium w-12">순위</th>
                      <th className="text-left py-3 font-medium">상품명</th>
                      <th className="text-right py-3 font-medium">다운로드수</th>
                      <th className="text-right py-3 font-medium">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr
                        key={product.id}
                        onClick={() => router.push(`/admin/products/${product.id}`)}
                        className="border-b border-border/50 last:border-0 hover:bg-muted/50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                ? 'bg-stone-100 text-stone-600'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3 text-foreground truncate max-w-[200px]">{product.title}</td>
                        <td className="py-3 text-right text-foreground font-medium">
                          {formatAmount(product.download_count)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{formatPrice(product.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column (40%) */}
        <div className="lg:col-span-2 space-y-6">
          {/* 최근 가입 회원 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="최근 가입 회원" href="/admin/members" />
            {loading ? (
              <ListSkeleton />
            ) : recentMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">회원이 없습니다</p>
            ) : (
              <div className="space-y-1">
                {recentMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => router.push(`/admin/members?search=${encodeURIComponent(member.email)}`)}
                    className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                  >
                    <AvatarInitial name={member.name || member.email} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{member.name || '-'}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(member.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 최근 컨설팅 신청 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="최근 컨설팅 신청" href="/admin/consulting" />
            {loading ? (
              <ListSkeleton />
            ) : recentConsulting.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">신청이 없습니다</p>
            ) : (
              <div className="space-y-1">
                {recentConsulting.map((item) => {
                  const status =
                    consultingStatusLabels[item.status] || {
                      label: item.status,
                      variant: 'outline' as const,
                    }
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => router.push('/admin/consulting')}
                      className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {packageLabels[item.package_type] || item.package_type}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={status.variant} className="text-[10px] shrink-0">
                        {status.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(item.created_at)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 최근 리뷰 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="최근 리뷰" href="/admin/reviews" />
            {loading ? (
              <ListSkeleton />
            ) : recentReviews.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">리뷰가 없습니다</p>
            ) : (
              <div className="space-y-1">
                {recentReviews.map((review) => {
                  const profile = reviewProfiles[review.user_id]
                  const prod = review.products
                  const productTitle = Array.isArray(prod)
                    ? prod[0]?.title || '-'
                    : prod?.title || '-'
                  return (
                    <button
                      key={review.id}
                      type="button"
                      onClick={() => router.push('/admin/reviews')}
                      className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-muted-foreground">{profile?.name || '-'}</span>
                        </div>
                        <p className="text-sm text-foreground truncate">{productTitle}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(review.created_at)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 최근 다운로드 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <SectionHeader title="최근 다운로드" href="/admin/downloads" />
            {loading ? (
              <ListSkeleton />
            ) : recentDownloads.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">다운로드 기록이 없습니다</p>
            ) : (
              <div className="space-y-1">
                {recentDownloads.map((dl) => {
                  const profile = downloadProfiles[dl.user_id]
                  const productTitle = downloadProducts[dl.product_id] || '-'
                  return (
                    <button
                      key={dl.id}
                      type="button"
                      onClick={() => router.push('/admin/downloads')}
                      className="w-full flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors text-left"
                    >
                      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{productTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">{profile?.name || '-'}</p>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(dl.downloaded_at)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
