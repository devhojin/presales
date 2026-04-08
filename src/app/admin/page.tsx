'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/types'
import Link from 'next/link'
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
  if (pct === null) return <p className="text-xs text-gray-400 mt-1">이전 기간 없음</p>
  const positive = pct >= 0
  return (
    <p className={`text-xs mt-1 font-medium ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
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
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-gray-200" />
            <div className="h-4 w-16 bg-gray-200 rounded" />
          </div>
          <div className="h-7 w-20 bg-gray-200 rounded" />
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
          <div className="h-4 bg-gray-200 rounded flex-1" />
          <div className="h-4 bg-gray-200 rounded w-16" />
          <div className="h-4 bg-gray-200 rounded w-12" />
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
          <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ===========================
// Revenue Line Chart
// ===========================

function RevenueChart({ data, period }: { data: DailyRevenue[]; period: Period }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-gray-400">
        데이터가 없습니다
      </div>
    )
  }

  const W = 700
  const H = 160
  const PAD_X = 50
  const PAD_Y = 20
  const BOTTOM = 24
  const plotW = W - PAD_X * 2
  const plotH = H - PAD_Y - BOTTOM

  const maxRev = Math.max(...data.map((d) => d.revenue), 1)
  const lastIdx = Math.max(data.length - 1, 1)

  function toX(i: number) {
    return PAD_X + (i / lastIdx) * plotW
  }
  function toY(v: number) {
    return PAD_Y + plotH - (v / maxRev) * plotH
  }

  const points = data.map((d, i) => `${toX(i)},${toY(d.revenue)}`).join(' ')
  const areaPoints = `${toX(0)},${PAD_Y + plotH} ${points} ${toX(lastIdx)},${PAD_Y + plotH}`

  // Y-axis ticks
  const yTicks = [0, 0.5, 1].map((r) => ({
    y: toY(maxRev * r),
    label:
      maxRev * r >= 1_000_000
        ? `${Math.round((maxRev * r) / 10000)}만`
        : maxRev * r >= 1000
        ? `${Math.round(maxRev * r / 1000)}천`
        : String(Math.round(maxRev * r)),
  }))

  // X-axis: show first, middle, last labels
  const xIndices = [0, Math.floor(data.length / 2), data.length - 1].filter(
    (v, i, arr) => arr.indexOf(v) === i
  )

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }}>
      {/* Grid lines */}
      {yTicks.map(({ y, label }) => (
        <g key={label}>
          <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="#e5e7eb" strokeWidth="1" />
          <text x={PAD_X - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
            {label}
          </text>
        </g>
      ))}
      {/* Area */}
      <polygon points={areaPoints} fill="rgba(239,68,68,0.1)" />
      {/* Line */}
      <polyline points={points} fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Dots */}
      {data.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.revenue)} r="3" fill="#ef4444" />
      ))}
      {/* X labels */}
      {xIndices.map((i) => (
        <text key={i} x={toX(i)} y={H - 4} textAnchor="middle" fontSize="10" fill="#6b7280">
          {data[i].date.slice(5).replace('-', '/')}
        </text>
      ))}
    </svg>
  )
}

// ===========================
// Sub-components
// ===========================

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      <Link href={href} className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
        전체보기 <ArrowUpRight className="w-3.5 h-3.5" />
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
          className={`w-3.5 h-3.5 ${i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`}
        />
      ))}
    </div>
  )
}

function AvatarInitial({ name }: { name: string }) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold shrink-0">
      {initial}
    </div>
  )
}

// ===========================
// Main component
// ===========================

export default function AdminDashboard() {
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
    function applyPeriod(q: any) {
      return periodStart ? q.gte('created_at', periodStart) : q
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function applyPrevPeriod(q: any) {
      if (!prevPeriodStart || !periodStart) return q
      return q.gte('created_at', prevPeriodStart).lt('created_at', periodStart)
    }

    // Current period queries
    const ordersQ = supabase.from('orders').select('id', { count: 'exact', head: true })
    const paidOrdersQ = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', ['paid', 'completed'])
    const membersQ = supabase.from('profiles').select('id', { count: 'exact', head: true })
    const consultingQ = supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
    const reviewsQ = supabase.from('reviews').select('id', { count: 'exact', head: true })
    const downloadsQ = supabase.from('download_logs').select('id', { count: 'exact', head: true })
    const paidAmountQ = supabase
      .from('orders')
      .select('total_amount, created_at')
      .in('status', ['paid', 'completed'])

    const [
      productsCount,
      ordersCount,
      paidOrdersCount,
      membersCount,
      consultingCount,
      reviewsCount,
      downloadsCount,
      paidOrdersData,
      recentOrdersData,
      topProductsData,
      recentMembersData,
      recentConsultingData,
      recentReviewsData,
      recentDownloadsData,
    ] = await Promise.all([
      supabase.from('products').select('id', { count: 'exact', head: true }),
      applyPeriod(ordersQ),
      applyPeriod(paidOrdersQ),
      applyPeriod(membersQ),
      applyPeriod(consultingQ),
      applyPeriod(reviewsQ),
      applyPeriod(downloadsQ),
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
        .from('profiles')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: false })
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
        prevMembersCount,
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
          supabase.from('profiles').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase.from('consulting_requests').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase.from('reviews').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase.from('download_logs').select('id', { count: 'exact', head: true })
        ),
        applyPrevPeriod(
          supabase
            .from('orders')
            .select('total_amount')
            .in('status', ['paid', 'completed'])
        ),
      ])

      prevKpi = {
        orders: prevOrdersCount.count || 0,
        paidOrders: prevPaidOrdersCount.count || 0,
        members: prevMembersCount.count || 0,
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

    // Build daily revenue chart data
    if (period !== '전체' && paidOrdersData.data) {
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
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', allUserIds)

      const map: ProfileMap = {}
      if (profiles) {
        for (const p of profiles) {
          map[p.id] = { name: p.name || '-', email: p.email || '-' }
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

    setLoading(false)
  }

  // ===========================
  // KPI card definitions
  // ===========================

  const prevLabel =
    period === '전체' ? '' : `이전 ${period}`

  const kpiRow1 = [
    {
      icon: Package,
      label: '등록상품',
      value: `${kpi.products}개`,
      color: 'bg-blue-500',
      href: '/admin/products',
      emphasis: false,
      change: null,
    },
    {
      icon: ShoppingCart,
      label: '총 주문',
      value: `${kpi.orders}건`,
      color: 'bg-emerald-500',
      href: '/admin/orders',
      emphasis: false,
      change: kpiChange.orders,
    },
    {
      icon: CreditCard,
      label: '결제완료',
      value: `${kpi.paidOrders}건`,
      color: 'bg-teal-500',
      href: '/admin/orders',
      emphasis: true,
      change: kpiChange.paidOrders,
    },
    {
      icon: Users,
      label: '가입회원',
      value: `${kpi.members}명`,
      color: 'bg-purple-500',
      href: '/admin/members',
      emphasis: false,
      change: kpiChange.members,
    },
  ]

  const kpiRow2 = [
    {
      icon: TrendingUp,
      label: '총 매출',
      value: `${formatAmount(kpi.revenue)}원`,
      color: 'bg-red-500',
      href: '/admin/orders',
      emphasis: true,
      change: kpiChange.revenue,
    },
    {
      icon: Download,
      label: '총 다운로드',
      value: `${kpi.downloads}건`,
      color: 'bg-cyan-500',
      href: '/admin/downloads',
      emphasis: false,
      change: kpiChange.downloads,
    },
    {
      icon: MessageSquare,
      label: '컨설팅신청',
      value: `${kpi.consulting}건`,
      color: 'bg-amber-500',
      href: '/admin/consulting',
      emphasis: false,
      change: kpiChange.consulting,
    },
    {
      icon: Star,
      label: '리뷰',
      value: `${kpi.reviews}건`,
      color: 'bg-yellow-500',
      href: '/admin/reviews',
      emphasis: false,
      change: kpiChange.reviews,
    },
  ]

  // ===========================
  // Notification icon helper
  // ===========================

  function NotificationIcon({ type }: { type: Notification['type'] }) {
    const configs = {
      order: { bg: 'bg-emerald-100', icon: <ShoppingCart className="w-4 h-4 text-emerald-600" /> },
      consulting: { bg: 'bg-amber-100', icon: <MessageSquare className="w-4 h-4 text-amber-600" /> },
      review: { bg: 'bg-yellow-100', icon: <Star className="w-4 h-4 text-yellow-600" /> },
      member: { bg: 'bg-purple-100', icon: <Users className="w-4 h-4 text-purple-600" /> },
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
        <h1 className="text-2xl font-bold">관리자 대시보드</h1>

        <div className="flex items-center gap-3">
          {/* Quick actions */}
          <Link
            href="/admin/products/new"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            새 상품 등록
          </Link>
          <Link
            href="/admin/orders"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <AlertCircle className="w-4 h-4 text-amber-500" />
            미처리 주문
          </Link>

          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              aria-label="알림"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">실시간 알림</p>
                </div>
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-sm text-gray-400">새 알림이 없습니다</div>
                ) : (
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map((n) => (
                      <div key={n.id} className="p-3 hover:bg-gray-50 flex items-start gap-3">
                        <NotificationIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{n.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-300 mt-1">
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
                          className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0 cursor-pointer"
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
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 font-medium">기간:</span>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <KPISkeleton />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpiRow1.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`rounded-xl p-5 hover:shadow-md transition-all group ${
                  card.emphasis
                    ? 'bg-blue-50 border-2 border-blue-200 ring-2 ring-primary/20'
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">{card.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                {card.change !== undefined ? (
                  <ChangeLabel pct={card.change} label={prevLabel} />
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{period === '전체' ? '전체 기간' : `최근 ${period}`}</p>
                )}
              </Link>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpiRow2.map((card) => (
              <Link
                key={card.label}
                href={card.href}
                className={`rounded-xl p-5 hover:shadow-md transition-all group ${
                  card.emphasis
                    ? 'bg-blue-50 border-2 border-blue-200 ring-2 ring-primary/20'
                    : 'bg-white border border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-9 h-9 rounded-lg ${card.color} flex items-center justify-center`}>
                    <card.icon className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-sm text-gray-500 group-hover:text-gray-700">{card.label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                {card.change !== undefined ? (
                  <ChangeLabel pct={card.change} label={prevLabel} />
                ) : (
                  <p className="text-xs text-gray-400 mt-1">{period === '전체' ? '전체 기간' : `최근 ${period}`}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Revenue chart */}
      {!loading && period !== '전체' && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">매출 추이 (최근 {period})</h2>
            <span className="text-xs text-gray-400">결제완료 기준</span>
          </div>
          <RevenueChart data={dailyRevenue} period={period} />
        </div>
      )}

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left column (60%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* 최근 주문 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="최근 주문" href="/admin/orders" />
            {loading ? (
              <TableSkeleton />
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">주문이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="text-left py-2 font-medium">주문번호</th>
                      <th className="text-left py-2 font-medium">주문자</th>
                      <th className="text-right py-2 font-medium">금액</th>
                      <th className="text-center py-2 font-medium">상태</th>
                      <th className="text-right py-2 font-medium">일시</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => {
                      const profile = orderProfiles[order.user_id]
                      const status =
                        statusLabels[order.status] || { label: order.status, variant: 'outline' as const }
                      return (
                        <tr key={order.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2.5 text-gray-700 font-mono text-xs">{order.order_number}</td>
                          <td className="py-2.5 text-gray-700">{profile?.name || '-'}</td>
                          <td className="py-2.5 text-right text-gray-900 font-medium">
                            {formatAmount(order.total_amount)}원
                          </td>
                          <td className="py-2.5 text-center">
                            <Badge variant={status.variant} className="text-xs">
                              {status.label}
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right text-gray-400 text-xs">
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="인기 상품 TOP 5" href="/admin/products" />
            {loading ? (
              <TableSkeleton />
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">상품이 없습니다</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-500">
                      <th className="text-center py-2 font-medium w-12">순위</th>
                      <th className="text-left py-2 font-medium">상품명</th>
                      <th className="text-right py-2 font-medium">다운로드수</th>
                      <th className="text-right py-2 font-medium">가격</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.map((product, index) => (
                      <tr key={product.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              index === 0
                                ? 'bg-yellow-100 text-yellow-700'
                                : index === 1
                                ? 'bg-gray-100 text-gray-600'
                                : index === 2
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-50 text-gray-400'
                            }`}
                          >
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-2.5 text-gray-700 truncate max-w-[200px]">{product.title}</td>
                        <td className="py-2.5 text-right text-gray-900 font-medium">
                          {formatAmount(product.download_count)}
                        </td>
                        <td className="py-2.5 text-right text-gray-600">{formatPrice(product.price)}</td>
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
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="최근 가입 회원" href="/admin/members" />
            {loading ? (
              <ListSkeleton />
            ) : recentMembers.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">회원이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <AvatarInitial name={member.name || member.email} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{member.name || '-'}</p>
                      <p className="text-xs text-gray-400 truncate">{member.email}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{formatDate(member.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 최근 컨설팅 신청 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="최근 컨설팅 신청" href="/admin/consulting" />
            {loading ? (
              <ListSkeleton />
            ) : recentConsulting.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">신청이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentConsulting.map((item) => {
                  const status =
                    consultingStatusLabels[item.status] || {
                      label: item.status,
                      variant: 'outline' as const,
                    }
                  return (
                    <div key={item.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {packageLabels[item.package_type] || item.package_type}
                          </Badge>
                        </div>
                      </div>
                      <Badge variant={status.variant} className="text-[10px] shrink-0">
                        {status.label}
                      </Badge>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(item.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 최근 리뷰 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="최근 리뷰" href="/admin/reviews" />
            {loading ? (
              <ListSkeleton />
            ) : recentReviews.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">리뷰가 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentReviews.map((review) => {
                  const profile = reviewProfiles[review.user_id]
                  const prod = review.products
                  const productTitle = Array.isArray(prod)
                    ? prod[0]?.title || '-'
                    : prod?.title || '-'
                  return (
                    <div key={review.id} className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <StarRating rating={review.rating} />
                          <span className="text-xs text-gray-400">{profile?.name || '-'}</span>
                        </div>
                        <p className="text-sm text-gray-700 truncate">{productTitle}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(review.created_at)}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 최근 다운로드 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <SectionHeader title="최근 다운로드" href="/admin/downloads" />
            {loading ? (
              <ListSkeleton />
            ) : recentDownloads.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">다운로드 기록이 없습니다</p>
            ) : (
              <div className="space-y-3">
                {recentDownloads.map((dl) => {
                  const profile = downloadProfiles[dl.user_id]
                  const productTitle = downloadProducts[dl.product_id] || '-'
                  return (
                    <div key={dl.id} className="flex items-center gap-3">
                      <Download className="w-4 h-4 text-gray-300 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{productTitle}</p>
                        <p className="text-xs text-gray-400 truncate">{profile?.name || '-'}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{formatDate(dl.downloaded_at)}</span>
                    </div>
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
