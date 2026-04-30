'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  FileText, Download, User, Loader2, Mail, Phone, Building, Pencil, Save, X,
  Lock, Eye, EyeOff, ChevronDown, ShoppingBag, AlertTriangle, Clock, Bookmark,
  ExternalLink, Megaphone, Rss, Package, ArrowRight, Store, BookOpen,
  ArrowLeft, BookmarkCheck, MessageCircle, CreditCard, HelpCircle, Tag, Copy, Check, Coins,
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { OrderReceiptDocument, buildReceiptPrintHtml } from '@/components/orders/OrderReceiptDocument'

// ===========================
// Types
// ===========================

interface Profile {
  name: string | null
  email: string
  phone: string | null
  company: string | null
  reward_balance?: number | null
  role: string
  created_at: string
}

interface OrderItem {
  id: number
  price: number
  original_price?: number | null
  discount_amount?: number | null
  discount_reason?: string | null
  discount_source_product_id?: number | null
  discount_source_product?: { id: number; title: string; price: number } | null
  products: { id: number; title: string; price: number } | { id: number; title: string; price: number }[] | null
}

interface Order {
  id: number
  order_number: string
  total_amount: number
  status: string
  created_at: string
  paid_at?: string | null
  payment_method?: string | null
  cash_receipt_url?: string | null
  refund_reason?: string | null
  coupon_discount?: number | null
  reward_discount?: number | null
  order_items?: OrderItem[]
}

interface PurchasedProduct {
  id: number
  title: string
  thumbnail_url: string | null
  format: string | null
  file_size: string | null
  is_free: boolean
}

interface DownloadLogProduct {
  id?: number | null
  title: string
  thumbnail_url?: string | null
  format?: string | null
  file_size?: string | null
  is_free?: boolean | null
}

interface DownloadLog {
  id: number
  product_id: number
  file_name: string
  downloaded_at: string
  products?: DownloadLogProduct | DownloadLogProduct[] | null
}

interface ActivityItem {
  type: 'order' | 'download' | 'bookmark'
  text: string
  time: string
  raw: Date
}

interface DbCoupon {
  id: string
  code: string
  name?: string | null
  description?: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_order_amount: number
  valid_from: string | null
  valid_until: string | null
  usage_count: number
  max_usage: number | null
  is_active: boolean
}

interface ConsultingRequest {
  id: string
  package_type: string
  status: string
  created_at: string
  message: string | null
}

interface RewardLedgerItem {
  id: number
  amount: number
  balance_after: number
  type: string
  status: string
  memo: string | null
  created_at: string
}

interface BookmarkAnn { id: string; title: string; organization: string | null; status: string; end_date: string | null; source_url: string | null; description?: string | null; start_date?: string | null }
interface BookmarkFeed { id: string; title: string; category: string; external_url: string | null; content?: string | null; source_name?: string | null; created_at?: string | null }
type BookmarkModalItem =
  | { type: 'announcement'; data: BookmarkAnn }
  | { type: 'feed'; data: BookmarkFeed }

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '대기', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  pending_transfer: { label: '입금승인대기', class: 'bg-orange-50 text-orange-700 border-orange-200' },
  paid: { label: '결제완료', class: 'bg-blue-50 text-blue-800 border-blue-200' },
  completed: { label: '완료', class: 'bg-blue-50 text-blue-800 border-blue-200' },
  cancelled: { label: '취소', class: 'bg-red-50 text-red-700 border-red-200' },
  refunded: { label: '환불', class: 'bg-muted text-muted-foreground border-border' },
  pending_refund: { label: '환불문의', class: 'bg-orange-50 text-orange-700 border-orange-200' },
}

const consultingStatusMap: Record<string, { label: string; class: string }> = {
  pending: { label: '접수', class: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  in_progress: { label: '진행중', class: 'bg-blue-50 text-blue-800 border-blue-200' },
  completed: { label: '완료', class: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: '취소', class: 'bg-red-50 text-red-700 border-red-200' },
}

const formatPrice = (price: number) => new Intl.NumberFormat('ko-KR').format(price) + '원'
const formatDate = (date: string) => new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })

function relativeTime(date: Date): string {
  const diff = Date.now() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return '방금 전'
  if (mins < 60) return `${mins}분 전`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}일 전`
  return formatDate(date.toISOString())
}

// ===========================
// Main Component
// ===========================

export default function MyConsolePage() {
  const router = useRouter()
  const { addToast } = useToastStore()

  // Draggable modal hooks
  const { handleMouseDown: deleteAccountMouseDown, modalStyle: deleteAccountStyle } = useDraggableModal()
  const { handleMouseDown: couponMouseDown, modalStyle: couponStyle } = useDraggableModal()
  const { handleMouseDown: receiptMouseDown, modalStyle: receiptStyle } = useDraggableModal()
  const { handleMouseDown: bookmarkDragMouseDown, modalStyle: bookmarkDragStyle } = useDraggableModal()
  const { handleMouseDown: refundMouseDown, modalStyle: refundStyle } = useDraggableModal()

  // Data state
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [purchasedProducts, setPurchasedProducts] = useState<PurchasedProduct[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([])
  const [annBookmarks, setAnnBookmarks] = useState<BookmarkAnn[]>([])
  const [feedBookmarks, setFeedBookmarks] = useState<BookmarkFeed[]>([])
  const [bookmarkModal, setBookmarkModal] = useState<BookmarkModalItem | null>(null)
  const [bookmarkTab, setBookmarkTab] = useState<'announcement' | 'feed'>('announcement')
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null)
  const [coupons, setCoupons] = useState<DbCoupon[]>([])
  const [showCouponModal, setShowCouponModal] = useState(false)
  const [consultingRequests, setConsultingRequests] = useState<ConsultingRequest[]>([])
  const [rewardLedger, setRewardLedger] = useState<RewardLedgerItem[]>([])

  // KPI counts
  const [kpi, setKpi] = useState({ orders: 0, bookmarks: 0, downloads: 0, chats: 0 })

  // UI state
  const [overlay, setOverlay] = useState<'profile' | null>(null)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)
  const [orderFilter, setOrderFilter] = useState('all')
  const [showDownloadHistory, setShowDownloadHistory] = useState(false)

  // Profile editing
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', company: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // Password
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState('')
  const pwCheck = validatePassword(newPassword)

  // Delete account
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('')
  const [showDeleteAccountPw, setShowDeleteAccountPw] = useState(false)
  const [deleteConfirmPhrase, setDeleteConfirmPhrase] = useState('')
  const [deleteReason, setDeleteReason] = useState('')
  const [hasPasswordIdentity, setHasPasswordIdentity] = useState(true)

  // Refund
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null)
  const [refundReason, setRefundReason] = useState('')
  const [refundSubmitting, setRefundSubmitting] = useState(false)

  // ===========================
  // Data Loading
  // ===========================

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login'); return }

      // 탈퇴 재인증 방식 판별: email identity 가 있으면 password, 없으면 confirm phrase
      const identities = (user.identities ?? []) as Array<{ provider?: string }>
      setHasPasswordIdentity(identities.some((i) => i.provider === 'email'))

      const [
        { data: profileData },
        { data: ordersData },
        { data: logsData },
        { data: annBmData },
        { data: feedBmData },
        { data: rewardLedgerData },
      ] = await Promise.all([
        supabase.from('profiles').select('name, email, phone, company, reward_balance, role, created_at').eq('id', user.id).single(),
        supabase.from('orders').select('id, order_number, total_amount, status, created_at, paid_at, payment_method, cash_receipt_url, refund_reason, coupon_discount, reward_discount, order_items(id, price, original_price, discount_amount, discount_reason, discount_source_product_id, products(id, title, price))').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(id, title, thumbnail_url, format, file_size, is_free)').eq('user_id', user.id).order('downloaded_at', { ascending: false }),
        supabase.from('announcement_bookmarks').select('announcement_id').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('feed_bookmarks').select('post_id').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reward_point_ledger').select('id, amount, balance_after, type, status, memo, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      ])

      // Purchased products
      const { data: paidOrders } = await supabase
        .from('orders')
        .select('id, order_items(product_id, products(id, title, thumbnail_url, format, file_size, is_free))')
        .eq('user_id', user.id)
        .in('status', ['paid', 'completed'])
      const productsMap = new Map<number, PurchasedProduct>()
      if (paidOrders) {
        for (const order of paidOrders) {
          const items = (order.order_items || []) as { product_id: number; products: PurchasedProduct | PurchasedProduct[] | null }[]
          for (const item of items) {
            const prod = Array.isArray(item.products) ? item.products[0] : item.products
            if (prod) productsMap.set(prod.id, prod as PurchasedProduct)
          }
        }
      }
      for (const log of (logsData || []) as DownloadLog[]) {
        const prod = Array.isArray(log.products) ? log.products[0] : log.products
        if (!prod) continue
        const productId = Number(prod.id ?? log.product_id)
        if (!Number.isInteger(productId) || productId <= 0) continue
        productsMap.set(productId, {
          id: productId,
          title: prod.title,
          thumbnail_url: prod.thumbnail_url ?? null,
          format: prod.format ?? null,
          file_size: prod.file_size ?? null,
          is_free: Boolean(prod.is_free),
        })
      }
      setPurchasedProducts(Array.from(productsMap.values()))

      // Announcement bookmarks details
      if (annBmData && annBmData.length > 0) {
        const ids = annBmData.map(b => b.announcement_id)
        const { data: anns, error: annErr } = await supabase.from('announcements').select('id, title, organization, status, end_date, start_date, source_url, description').in('id', ids)
        if (annErr) console.error('annErr', annErr)
        if (anns) setAnnBookmarks(ids.map(id => anns.find(a => a.id === id)).filter(Boolean) as BookmarkAnn[])
      }

      // Feed bookmarks details
      if (feedBmData && feedBmData.length > 0) {
        const ids = feedBmData.map(b => b.post_id)
        const { data: posts, error: feedErr } = await supabase.from('community_posts').select('id, title, category, external_url, content, source_name, created_at').in('id', ids)
        if (feedErr) console.error('feedErr', feedErr)
        if (posts) setFeedBookmarks(ids.map(id => posts.find(p => p.id === id)).filter(Boolean) as BookmarkFeed[])
      }

      const normalizedOrders: Order[] = ((ordersData || []) as Order[]).map(order => ({
        ...order,
        order_items: (order.order_items || []).map(item => ({ ...item, discount_source_product: null })),
      }))
      const discountSourceIds = Array.from(new Set(
        normalizedOrders.flatMap(order => (order.order_items || [])
          .map(item => item.discount_source_product_id)
          .filter((id): id is number => typeof id === 'number' && id > 0))
      ))
      if (discountSourceIds.length > 0) {
        const { data: discountSourceProducts } = await supabase
          .from('products')
          .select('id, title, price')
          .in('id', discountSourceIds)
        const sourceMap = new Map((discountSourceProducts || []).map(product => [product.id, product]))
        for (const order of normalizedOrders) {
          order.order_items = (order.order_items || []).map(item => ({
            ...item,
            discount_source_product: item.discount_source_product_id ? sourceMap.get(item.discount_source_product_id) ?? null : null,
          }))
        }
      }

      setProfile(profileData || { name: null, email: user.email || '', phone: null, company: null, reward_balance: 0, role: 'user', created_at: user.created_at || '' })
      setOrders(normalizedOrders)
      setDownloadLogs((logsData || []) as DownloadLog[])
      setRewardLedger((rewardLedgerData || []) as RewardLedgerItem[])
      setKpi({
        orders: ordersData?.length || 0,
        bookmarks: (annBmData?.length || 0) + (feedBmData?.length || 0),
        downloads: logsData?.length || 0,
        chats: 0,
      })
      setLoading(false)

      // 채팅방 수 로드
      try {
        const res = await fetch('/api/chat/rooms')
        const data = await res.json()
        if (data.rooms) setKpi(k => ({ ...k, chats: data.rooms.length }))
      } catch { /* ignore */ }

      // 내가 보유한 쿠폰 (user_coupons 기반, 미사용 + 유효)
      const now = new Date()
      const { data: myCoupons } = await supabase
        .from('user_coupons')
        .select('id, received_at, used_at, coupons:coupon_id(id, code, name, description, discount_type, discount_value, min_order_amount, valid_from, valid_until, usage_count, max_usage, is_active)')
        .eq('user_id', user.id)
        .is('used_at', null)
        .order('received_at', { ascending: false })

      const available = (myCoupons || [])
        .map(uc => uc.coupons as unknown as DbCoupon & { valid_from: string | null; valid_until: string | null; is_active: boolean; max_usage: number | null; usage_count: number })
        .filter(c => {
          if (!c || !c.is_active) return false
          if (c.valid_from && new Date(c.valid_from) > now) return false
          if (c.valid_until && new Date(c.valid_until) < now) return false
          if (c.max_usage !== null && c.usage_count >= c.max_usage) return false
          return true
        })
      setCoupons(available as DbCoupon[])

      // 컨설팅 문의 내역
      const { data: consultingData } = await supabase
        .from('consulting_requests')
        .select('id, package_type, status, created_at, message')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setConsultingRequests((consultingData || []) as ConsultingRequest[])
    }
    load()
  }, [router])

  // ===========================
  // Handlers
  // ===========================

  async function handleProductDownload(productId: number, _title: string) {
    try {
      const res = await fetch('/api/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId }) })
      if (!res.ok) { const d = await res.json(); addToast(d.error || '다운로드 실패', 'error'); return }
      const { url } = await res.json()
      window.open(url, '_blank')
    } catch { addToast('다운로드 중 오류가 발생했습니다', 'error'); return }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: newLogs } = await supabase.from('download_logs').select('id, product_id, file_name, downloaded_at, products(id, title, thumbnail_url, format, file_size, is_free)').eq('user_id', user.id).order('downloaded_at', { ascending: false })
    setDownloadLogs((newLogs || []) as DownloadLog[])
    setPurchasedProducts((prev) => {
      const productsMap = new Map(prev.map((product) => [product.id, product]))
      for (const log of (newLogs || []) as DownloadLog[]) {
        const prod = Array.isArray(log.products) ? log.products[0] : log.products
        if (!prod) continue
        const downloadedProductId = Number(prod.id ?? log.product_id)
        if (!Number.isInteger(downloadedProductId) || downloadedProductId <= 0) continue
        productsMap.set(downloadedProductId, {
          id: downloadedProductId,
          title: prod.title,
          thumbnail_url: prod.thumbnail_url ?? null,
          format: prod.format ?? null,
          file_size: prod.file_size ?? null,
          is_free: Boolean(prod.is_free),
        })
      }
      return Array.from(productsMap.values())
    })
  }

  async function handleRefundRequest(orderId: number, reason: string) {
    setRefundSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { addToast('로그인이 필요합니다', 'error'); return }
      const { data, error } = await supabase
        .from('orders')
        .update({ refund_reason: reason })
        .eq('id', orderId)
        .eq('user_id', user.id)
        .select('id')
      if (error) { addToast('환불 문의 접수 실패: ' + error.message, 'error') }
      else if (!data || data.length === 0) { addToast('주문 접근 권한을 확인할 수 없습니다', 'error') }
      else { setOrders(prev => prev.map(o => o.id === orderId ? { ...o, refund_reason: reason } : o)); setRefundOrderId(null); setRefundReason(''); addToast('환불 문의가 접수되었습니다', 'success') }
    } catch { addToast('환불 문의 접수 중 오류', 'error') }
    finally { setRefundSubmitting(false) }
  }

  function printReceipt(order: Order) {
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    iframe.setAttribute('aria-hidden', 'true')
    document.body.appendChild(iframe)

    const printDocument = iframe.contentWindow?.document
    if (!printDocument) {
      iframe.remove()
      addToast('인쇄 창을 열 수 없습니다. 다시 시도해주세요.', 'error')
      return
    }

    printDocument.open()
    printDocument.write(buildReceiptPrintHtml(order, profile))
    printDocument.close()

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus()
        iframe.contentWindow?.print()
      } catch {
        addToast('영수증 인쇄를 시작하지 못했습니다. 브라우저 인쇄 설정을 확인해주세요.', 'error')
      } finally {
        setTimeout(() => iframe.remove(), 1000)
      }
    }, 150)
  }

  // Recent activities
  const activities = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []
    orders.slice(0, 5).forEach(o => items.push({ type: 'order', text: `${statusMap[o.status]?.label || o.status} — ${formatPrice(o.total_amount)}`, time: relativeTime(new Date(o.created_at)), raw: new Date(o.created_at) }))
    downloadLogs.slice(0, 5).forEach(l => {
      const title = Array.isArray(l.products) ? l.products[0]?.title : l.products?.title
      items.push({ type: 'download', text: `다운로드 — ${title || l.file_name}`, time: relativeTime(new Date(l.downloaded_at)), raw: new Date(l.downloaded_at) })
    })
    return items.sort((a, b) => b.raw.getTime() - a.raw.getTime()).slice(0, 8)
  }, [orders, downloadLogs])

  // Filtered orders
  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders
    if (orderFilter === 'pending') return orders.filter(o => o.status === 'pending')
    if (orderFilter === 'completed') return orders.filter(o => o.status === 'paid' || o.status === 'completed')
    return orders.filter(o => ['cancelled', 'refunded', 'pending_refund'].includes(o.status))
  }, [orders, orderFilter])

  const catLabel = (c: string) => ({ news: '뉴스', policy: '정책', bid: '입찰', task: '과제', event: '행사' }[c] || c)
  const catColor = (c: string) => ({ news: 'bg-blue-100 text-blue-700', policy: 'bg-blue-100 text-blue-800', bid: 'bg-orange-100 text-orange-700', task: 'bg-purple-100 text-purple-700', event: 'bg-pink-100 text-pink-700' }[c] || 'bg-muted text-muted-foreground')
  const rewardTypeLabel = (type: string) => ({
    signup: '회원가입',
    review: '후기 작성',
    purchase: '구매 적립',
    use: '주문 사용',
    refund: '환불 복원',
    cancel: '취소',
    admin_adjust: '관리자 조정',
  }[type] || type)
  const rewardLedgerLabel = (item: RewardLedgerItem) => (
    item.type === 'admin_adjust' ? '관리자 지급 적립금' : item.memo || rewardTypeLabel(item.type)
  )

  // ===========================
  // Loading
  // ===========================

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  // ===========================
  // Profile Overlay
  // ===========================

  if (overlay === 'profile' && profile) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <button onClick={() => { setOverlay(null); setEditingProfile(false); setShowPasswordSection(false) }} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> 마이페이지로 돌아가기
        </button>

        <h1 className="text-2xl font-bold mb-8">내 정보</h1>

        {/* Profile Info */}
        <div className="border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">기본 정보</h2>
            {!editingProfile ? (
              <button onClick={() => { setProfileForm({ name: profile.name || '', phone: profile.phone || '', company: profile.company || '' }); setEditingProfile(true); setProfileMsg('') }} className="flex items-center gap-1.5 text-sm text-primary hover:underline cursor-pointer"><Pencil className="w-3.5 h-3.5" /> 수정</button>
            ) : (
              <button onClick={() => { setEditingProfile(false); setProfileMsg('') }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-3.5 h-3.5" /> 취소</button>
            )}
          </div>
          <Separator className="mb-6" />
          {profileMsg && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${profileMsg.includes('완료') ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{profileMsg}</div>}

          {!editingProfile ? (
            <div className="space-y-4">
              {[{ icon: User, label: '이름', value: profile.name }, { icon: Mail, label: '이메일', value: profile.email }, { icon: Phone, label: '연락처', value: profile.phone }, { icon: Building, label: '회사명', value: profile.company }].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3"><Icon className="w-4 h-4 text-muted-foreground" /><div><p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-medium">{value || '-'}</p></div></div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">가입일: {formatDate(profile.created_at)}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {[{ icon: User, label: '이름', key: 'name' as const, type: 'text', ph: '이름을 입력하세요' }, { icon: Phone, label: '연락처', key: 'phone' as const, type: 'tel', ph: '010-1234-5678' }, { icon: Building, label: '회사명', key: 'company' as const, type: 'text', ph: '회사명을 입력하세요' }].map(f => (
                <div key={f.key}><label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5"><f.icon className="w-3.5 h-3.5" />{f.label}</label><input type={f.type} value={profileForm[f.key]} onChange={e => setProfileForm(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder={f.ph} /></div>
              ))}
              <div><label className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5"><Mail className="w-3.5 h-3.5" />이메일</label><input type="email" value={profile.email} disabled className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-muted text-muted-foreground" /></div>
              <button onClick={async () => {
                setProfileSaving(true); setProfileMsg('')
                try {
                  const supabase = createClient(); const { data: { user } } = await supabase.auth.getUser()
                  if (!user) { setProfileMsg('로그인 필요'); return }
                  const { error } = await supabase.from('profiles').update({ name: profileForm.name || null, phone: profileForm.phone || null, company: profileForm.company || null }).eq('id', user.id)
                  if (error) setProfileMsg('저장 실패: ' + error.message)
                  else { setProfile(p => p ? { ...p, name: profileForm.name || null, phone: profileForm.phone || null, company: profileForm.company || null } : p); setEditingProfile(false); setProfileMsg('프로필이 저장 완료되었습니다.') }
                } catch { setProfileMsg('저장 중 오류') } finally { setProfileSaving(false) }
              }} disabled={profileSaving} className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"><Save className="w-4 h-4" />{profileSaving ? '저장 중...' : '저장'}</button>
            </div>
          )}
        </div>

        {/* Password */}
        <div className="border border-border rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> 비밀번호 변경</h2>
            {!showPasswordSection && <button onClick={() => { setShowPasswordSection(true); setPwMsg(''); setNewPassword(''); setConfirmPassword('') }} className="text-sm text-primary hover:underline cursor-pointer">변경하기</button>}
          </div>
          <Separator className="mb-6" />
          {pwMsg && <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${pwMsg.includes('완료') ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{pwMsg}</div>}
          {!showPasswordSection ? <p className="text-sm text-muted-foreground">&quot;변경하기&quot; 버튼을 클릭하세요.</p> : (
            <div className="space-y-4">
              <div><label className="block text-xs text-muted-foreground mb-1.5">새 비밀번호</label><div className="relative"><input type={showNewPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="새 비밀번호" /><button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">{showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>
                {newPassword && <div className="mt-2 space-y-1"><div className="flex gap-1">{[0,1,2,3].map(i => <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pwCheck.score ? pwCheck.color : 'bg-gray-200'}`} />)}</div><p className={`text-xs ${pwCheck.valid ? 'text-blue-700' : 'text-muted-foreground'}`}>강도: {pwCheck.label}</p>{pwCheck.errors.length > 0 && <ul className="text-xs text-red-500 space-y-0.5">{pwCheck.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}</div>}
              </div>
              <div><label className="block text-xs text-muted-foreground mb-1.5">비밀번호 확인</label><div className="relative"><input type={showConfirmPw ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 pr-10 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="비밀번호 확인" /><button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">{showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div>{confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다.</p>}</div>
              <div className="flex gap-2">
                <button onClick={async () => { setPwMsg(''); if (!pwCheck.valid) { setPwMsg('비밀번호 정책 미충족'); return } if (newPassword !== confirmPassword) { setPwMsg('비밀번호 불일치'); return } setPwSaving(true); try { const supabase = createClient(); const { error } = await supabase.auth.updateUser({ password: newPassword }); if (error) setPwMsg('변경 실패: ' + error.message); else { setPwMsg('비밀번호가 변경 완료되었습니다.'); setNewPassword(''); setConfirmPassword(''); setShowPasswordSection(false) } } catch { setPwMsg('변경 중 오류') } finally { setPwSaving(false) } }} disabled={pwSaving || !pwCheck.valid || newPassword !== confirmPassword || !newPassword} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 cursor-pointer">{pwSaving ? '변경 중...' : '비밀번호 변경'}</button>
                <button onClick={() => { setShowPasswordSection(false); setNewPassword(''); setConfirmPassword(''); setPwMsg('') }} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-muted cursor-pointer">취소</button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Account */}
        <div className="border border-red-200 rounded-2xl p-6">
          <h2 className="font-semibold text-red-600 flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4" /> 회원 탈퇴</h2>
          <Separator className="mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            탈퇴 시 개인정보(이름·연락처·이메일 등)는 즉시 익명화됩니다. 다만 주문/결제·다운로드 이력은
            전자상거래법·소비자분쟁 기준에 따라 일정 기간(최대 5년) 익명 상태로 보존됩니다.
          </p>
          <button type="button" onClick={() => setShowDeleteAccount(true)} className="h-10 px-5 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 cursor-pointer">회원 탈퇴</button>
        </div>

        {/* Delete Account Modal */}
        {showDeleteAccount && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteAccount(false)}>
            <div className="bg-background rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" style={deleteAccountStyle} onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3 cursor-move" onMouseDown={deleteAccountMouseDown}><AlertTriangle className="w-5 h-5 text-red-500" /><h3 className="text-lg font-semibold">회원 탈퇴</h3></div>
              <p className="text-sm text-muted-foreground mb-4">
                개인정보는 즉시 익명화되며 재가입이 가능합니다. 주문/결제 이력은 법령에 따라 익명 상태로 보존됩니다.
              </p>

              {hasPasswordIdentity ? (
                <div className="mb-3">
                  <label className="text-sm font-medium mb-2 block">비밀번호 확인 *</label>
                  <div className="relative">
                    <input
                      type={showDeleteAccountPw ? 'text' : 'password'}
                      placeholder="비밀번호 입력"
                      value={deleteAccountPassword}
                      onChange={e => setDeleteAccountPassword(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button type="button" onClick={() => setShowDeleteAccountPw(!showDeleteAccountPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                      {showDeleteAccountPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="text-sm font-medium mb-2 block">확인 문구 입력 *</label>
                  <input
                    type="text"
                    placeholder="탈퇴합니다"
                    value={deleteConfirmPhrase}
                    onChange={e => setDeleteConfirmPhrase(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    SNS 로그인 계정입니다. 본인 확인을 위해 <span className="font-semibold text-foreground">탈퇴합니다</span> 를 그대로 입력해주세요.
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">탈퇴 사유 (선택)</label>
                <textarea
                  value={deleteReason}
                  onChange={e => setDeleteReason(e.target.value.slice(0, 300))}
                  placeholder="개선할 점이 있다면 알려주세요"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => { setShowDeleteAccount(false); setDeleteAccountPassword(''); setShowDeleteAccountPw(false); setDeleteConfirmPhrase(''); setDeleteReason('') }} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
                <button
                  type="button"
                  disabled={
                    deletingAccount ||
                    (hasPasswordIdentity ? !deleteAccountPassword.trim() : deleteConfirmPhrase.trim() !== '탈퇴합니다')
                  }
                  onClick={async () => {
                    setDeletingAccount(true)
                    try {
                      const payload: Record<string, string> = { reason: deleteReason }
                      if (hasPasswordIdentity) payload.password = deleteAccountPassword
                      else payload.confirmPhrase = deleteConfirmPhrase
                      const res = await fetch('/api/auth/delete-account', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                      })
                      if (!res.ok) {
                        const d = await res.json().catch(() => ({}))
                        addToast(d.error || '탈퇴 오류', 'error')
                        return
                      }
                      const supabase = createClient()
                      await supabase.auth.signOut()
                      addToast('회원 탈퇴가 완료되었습니다', 'info')
                      router.push('/')
                      router.refresh()
                    } catch {
                      addToast('탈퇴 오류', 'error')
                    } finally {
                      setDeletingAccount(false)
                      setShowDeleteAccount(false)
                      setDeleteAccountPassword('')
                      setShowDeleteAccountPw(false)
                      setDeleteConfirmPhrase('')
                      setDeleteReason('')
                    }
                  }}
                  className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 cursor-pointer disabled:opacity-50"
                >
                  {deletingAccount ? '처리 중...' : '탈퇴하기'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ===========================
  // Main Dashboard
  // ===========================

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
      <div className="mt-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">마이페이지</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {profile?.email || profile?.name || '회원'} · 가입일 {profile ? formatDate(profile.created_at) : '-'}
          </p>
        </div>
        <button onClick={() => setOverlay('profile')} className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer">
          <User className="w-4 h-4" /> 내 정보
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
        {/* 내 쿠폰 (맨 앞, 버튼) */}
        <button
          type="button"
          onClick={() => setShowCouponModal(true)}
          className="group bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer text-left"
        >
          <div className="w-10 h-10 rounded-xl text-pink-600 bg-pink-50 flex items-center justify-center mb-3">
            <Tag className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{coupons.length}<span className="text-sm font-normal text-muted-foreground ml-1">장</span></p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-pink-600 transition-colors">내 쿠폰 <ArrowRight className="w-3 h-3" /></p>
        </button>
        <Link href="/cart"
          className="group bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer">
          <div className="w-10 h-10 rounded-xl text-blue-700 bg-blue-50 flex items-center justify-center mb-3">
            <Coins className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-foreground">{formatPrice(profile?.reward_balance || 0)}</p>
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-blue-700 transition-colors">내 적립금 <ArrowRight className="w-3 h-3" /></p>
        </Link>
        {[
          { label: '내 주문', value: kpi.orders, icon: Package, color: 'text-primary bg-primary/10', href: '#orders' },
          { label: '다운로드', value: kpi.downloads, icon: Download, color: 'text-orange-600 bg-orange-50', href: '#orders' },
          { label: '공고 즐겨찾기', value: annBookmarks.length, icon: Megaphone, color: 'text-blue-600 bg-blue-50', href: '#bookmarks' },
          { label: '피드 즐겨찾기', value: feedBookmarks.length, icon: Rss, color: 'text-blue-700 bg-blue-50', href: '#bookmarks' },
        ].map(card => (
          <Link key={card.label} href={card.href}
            className="group bg-card border border-border/50 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer">
            <div className={`w-10 h-10 rounded-xl ${card.color} flex items-center justify-center mb-3`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}<span className="text-sm font-normal text-muted-foreground ml-1">건</span></p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 group-hover:text-primary transition-colors">{card.label} <ArrowRight className="w-3 h-3" /></p>
          </Link>
        ))}
      </div>

      {/* Mobile: Profile button */}
      <div className="md:hidden mb-6">
        <button onClick={() => setOverlay('profile')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted cursor-pointer">
          <User className="w-4 h-4" /> 내 정보 관리
        </button>
      </div>

      {/* 내 상품 (다운로드) */}
      {purchasedProducts.length > 0 && (
        <div className="mb-6">
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Download className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">내 상품</h2>
              <span className="text-xs text-muted-foreground">{purchasedProducts.length}개</span>
            </div>
            <div className="grid gap-3">
              {purchasedProducts.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:shadow-sm transition-shadow">
                  <div className="flex items-center gap-3 min-w-0">
                    {item.thumbnail_url ? (
                      <img src={item.thumbnail_url} alt={item.title} className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.format || '문서'}{item.file_size ? ` · ${item.file_size}` : ''}</p>
                    </div>
                  </div>
                  <div className="ml-3 flex shrink-0 items-center gap-2">
                    <Link
                      href={`/store/${item.id}?tab=review`}
                      className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      후기작성
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleProductDownload(item.id, item.title)}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      다운로드
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 3: Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Orders Section */}
          <div id="orders" className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">내 주문</h2>
                <span className="text-xs text-muted-foreground">{orders.length}건</span>
              </div>
            </div>

            {/* Order Filter Tabs */}
            <div className="flex gap-1 mb-4 border-b border-border/50">
              {[{ key: 'all', label: '전체' }, { key: 'pending', label: '대기' }, { key: 'completed', label: '완료' }, { key: 'other', label: '기타' }].map(t => (
                <button key={t.key} onClick={() => setOrderFilter(t.key)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${orderFilter === t.key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {filteredOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">주문 내역이 없습니다</p>
                <Link href="/store" className="inline-block mt-3 text-xs text-primary hover:underline">스토어 바로가기</Link>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {filteredOrders.map(order => {
                  const isExpanded = expandedOrderId === order.id
                  const items = (order.order_items || []) as OrderItem[]
                  const statusInfo = statusMap[order.status] || { label: order.status, class: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <div key={order.id} className="rounded-xl border border-border/50 overflow-hidden">
                      <button type="button" onClick={() => setExpandedOrderId(isExpanded ? null : order.id)} className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer text-left">
                        <div><p className="text-xs font-mono text-muted-foreground">{order.order_number}</p><p className="text-sm font-semibold mt-0.5">{formatPrice(order.total_amount)}</p></div>
                        <div className="flex items-center gap-3"><div className="text-right"><Badge className={`text-xs border ${statusInfo.class}`}>{statusInfo.label}</Badge><p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p></div><ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></div>
                      </button>
                      {isExpanded && (
                        <div className="border-t border-border bg-muted/20 px-4 py-4 space-y-3">
                          {items.map(item => {
                            const prod = Array.isArray(item.products) ? item.products[0] : item.products
                            const hasDiscount = (item.discount_amount ?? 0) > 0 && item.original_price && item.original_price > item.price
                            return (
                              <div key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-background border border-border/50">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{prod?.title || '-'}</p>
                                  {hasDiscount && (
                                    <div className="mt-1 space-y-0.5">
                                      <p className="text-[10px] text-blue-700">
                                        구매 이력 할인 -{formatPrice(item.discount_amount || 0)}
                                      </p>
                                      {item.discount_source_product && (
                                        <p className="text-[10px] text-blue-800">
                                          구매한 상품: {item.discount_source_product.title}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-3">
                                  <div className="text-right">
                                    {hasDiscount && (
                                      <p className="text-[10px] text-muted-foreground line-through">{formatPrice(item.original_price || 0)}</p>
                                    )}
                                    <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                                  </div>
                                  {(order.status === 'paid' || order.status === 'completed') && prod && (
                                    <>
                                      <Link
                                        href={`/store/${prod.id}?tab=review`}
                                        onClick={e => e.stopPropagation()}
                                        className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                                      >
                                        <Pencil className="w-3 h-3" />후기작성
                                      </Link>
                                      <button type="button" onClick={e => { e.stopPropagation(); handleProductDownload(prod.id, prod.title) }} className="px-3 py-1 rounded-lg bg-blue-700 text-white text-xs font-medium hover:bg-blue-800 flex items-center gap-1 cursor-pointer"><Download className="w-3 h-3" />다운로드</button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button type="button" onClick={e => { e.stopPropagation(); setReceiptOrder(order) }} className="px-3 py-1.5 rounded-lg border border-border text-foreground text-xs font-medium hover:bg-muted cursor-pointer flex items-center gap-1">
                                <FileText className="w-3 h-3" /> 주문서 보기
                              </button>
                              {(order.status === 'paid' || order.status === 'completed') && <button type="button" onClick={e => { e.stopPropagation(); printReceipt(order) }} className="px-3 py-1.5 rounded-lg border border-blue-300 text-primary text-xs font-medium hover:bg-primary/8 cursor-pointer">영수증 인쇄</button>}
                            </div>
                            <div className="text-right">
                              {(order.reward_discount ?? 0) > 0 && (
                                <p className="text-[10px] text-blue-700">적립금 -{formatPrice(order.reward_discount || 0)}</p>
                              )}
                              <p className="text-sm font-semibold">합계: {formatPrice(order.total_amount)}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Consulting Inquiry History */}
          {consultingRequests.length > 0 && (
            <div className="bg-card border border-border/50 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <HelpCircle className="w-4 h-4 text-primary" />
                <h2 className="font-semibold">컨설팅 문의 내역</h2>
                <span className="text-xs text-muted-foreground">{consultingRequests.length}건</span>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {consultingRequests.map(req => {
                  const statusInfo = consultingStatusMap[req.status] || { label: req.status, class: 'bg-muted text-muted-foreground border-border' }
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{req.package_type || '컨설팅 문의'}</p>
                        {req.message && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.message}</p>}
                        <p className="text-[11px] text-muted-foreground mt-1">{formatDate(req.created_at)}</p>
                      </div>
                      <Badge className={`text-xs border shrink-0 ml-3 ${statusInfo.class}`}>{statusInfo.label}</Badge>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent Activity */}
          <div className="bg-card border border-border/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">최근 활동</h2>
            </div>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">아직 활동 내역이 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((a, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.type === 'order' ? 'bg-primary/10 text-primary' : a.type === 'download' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-700'}`}>
                      {a.type === 'order' ? <Package className="w-4 h-4" /> : a.type === 'download' ? <Download className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </div>
                    <p className="text-sm text-foreground flex-1 truncate">{a.text}</p>
                    <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT Column (1/3) - Sticky */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">

          {/* Reward Points */}
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-700" />
                <h3 className="text-sm font-semibold">내 적립금</h3>
              </div>
              <p className="text-base font-bold text-primary">{formatPrice(profile?.reward_balance || 0)}</p>
            </div>
            {rewardLedger.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">적립금 내역이 없습니다</p>
            ) : (
              <div className="space-y-2">
                {rewardLedger.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground">{rewardLedgerLabel(item)}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{formatDate(item.created_at)} · 잔액 {formatPrice(item.balance_after)}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold ${item.amount > 0 ? 'text-blue-700' : 'text-red-600'}`}>
                      {item.amount > 0 ? '+' : '-'}{formatPrice(Math.abs(item.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Links */}
          <div className="bg-card border border-border/50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold mb-3">빠른 링크</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '스토어', href: '/store', icon: Store, color: 'from-primary to-blue-700' },
                { label: '컨설팅', href: '/consulting', icon: HelpCircle, color: 'from-violet-500 to-violet-600' },
                { label: '공고사업', href: '/announcements', icon: Megaphone, color: 'from-blue-500 to-blue-600' },
                { label: 'IT피드', href: '/feeds', icon: Rss, color: 'from-orange-400 to-orange-500' },
              ].map(link => (
                <Link key={link.label} href={link.href} className="group flex flex-col items-center gap-2 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${link.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <link.icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground">{link.label}</span>
                </Link>
              ))}
            </div>
            {/* Chat Open Button */}
            <button
              type="button"
              onClick={() => {
                const event = new CustomEvent('open-chat-widget')
                window.dispatchEvent(event)
              }}
              className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 text-white text-sm font-medium hover:shadow-md transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" /> 나의 채팅 열기
            </button>
          </div>

          {/* Bookmarks Widget */}
          <div id="bookmarks" className="bg-card border border-border/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bookmark className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold">즐겨찾기</h3>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-3 border-b border-border/50">
              <button
                type="button"
                onClick={() => setBookmarkTab('announcement')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                  bookmarkTab === 'announcement' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" /> 공고 <span className="text-[10px] text-muted-foreground">{annBookmarks.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setBookmarkTab('feed')}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition cursor-pointer ${
                  bookmarkTab === 'feed' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Rss className="w-3.5 h-3.5" /> 피드 <span className="text-[10px] text-muted-foreground">{feedBookmarks.length}</span>
              </button>
            </div>

            {bookmarkTab === 'announcement' ? (
              annBookmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">즐겨찾기한 공고가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {annBookmarks.map(ann => {
                    const expired = ann.end_date ? new Date(ann.end_date) < new Date() : false
                    return (
                      <button type="button" key={`a-${ann.id}`} onClick={() => setBookmarkModal({ type: 'announcement', data: ann })} className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer text-left">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${expired || ann.status === 'closed' ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-800'}`}>
                          {expired || ann.status === 'closed' ? '마감' : '공고'}
                        </span>
                        <span className="text-xs text-foreground truncate flex-1 group-hover:text-primary transition-colors">{ann.title}</span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              feedBookmarks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Rss className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">즐겨찾기한 피드가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {feedBookmarks.map(feed => (
                    <button type="button" key={`f-${feed.id}`} onClick={() => setBookmarkModal({ type: 'feed', data: feed })} className="w-full flex items-center gap-2 py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer text-left">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 ${catColor(feed.category)}`}>{catLabel(feed.category)}</span>
                      <span className="text-xs text-foreground truncate flex-1 group-hover:text-primary transition-colors">{feed.title}</span>
                    </button>
                  ))}
                </div>
              )
            )}

            <div className="mt-3 pt-3 border-t border-border/50">
              <Link
                href={bookmarkTab === 'announcement' ? '/announcements?tab=bookmarks' : '/feeds?tab=bookmarks'}
                className="text-xs text-primary hover:underline"
              >
                {bookmarkTab === 'announcement' ? '공고' : '피드'} 전체보기 →
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Modal */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowCouponModal(false)}>
          <div className="bg-background rounded-2xl max-w-md w-full max-h-[85vh] shadow-xl flex flex-col" style={couponStyle} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-border/50 shrink-0 cursor-move" onMouseDown={couponMouseDown}>
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-semibold">내 쿠폰</h3>
                <span className="text-xs text-muted-foreground">{coupons.length}장</span>
              </div>
              <button type="button" onClick={() => setShowCouponModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {coupons.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">사용 가능한 쿠폰이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {coupons.map(c => {
                    const discountLabel = c.discount_type === 'percentage'
                      ? `${c.discount_value}%`
                      : `${c.discount_value.toLocaleString()}원`
                    const minOrderLabel = c.min_order_amount > 0
                      ? `${c.min_order_amount.toLocaleString()}원 이상`
                      : '제한 없음'
                    const validLabel = c.valid_until
                      ? `${formatDate(c.valid_until)}까지`
                      : '무제한'
                    return (
                      <div key={c.id} className="relative border border-border/50 rounded-xl p-4 bg-gradient-to-br from-pink-50 to-white">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {c.name && (
                              <p className="text-sm font-semibold text-foreground mb-1 truncate">{c.name}</p>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-white border border-pink-200 text-pink-700">
                                {c.code}
                                <button
                                  type="button"
                                  onClick={() => { navigator.clipboard.writeText(c.code); addToast('쿠폰 코드가 복사되었습니다', 'success') }}
                                  className="text-pink-500 hover:text-pink-700 cursor-pointer"
                                  title="코드 복사"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </span>
                            </div>
                            <p className="text-2xl font-bold text-pink-600 leading-none">{discountLabel}<span className="text-xs font-normal text-muted-foreground ml-1">할인</span></p>
                            {c.description && (
                              <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">{c.description}</p>
                            )}
                            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                              <p className="flex items-center gap-1.5"><Check className="w-3 h-3 text-blue-500" /> 최소 주문: {minOrderLabel}</p>
                              <p className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-muted-foreground" /> 유효 기간: {validLabel}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end p-4 border-t border-border/50 shrink-0">
              <button type="button" onClick={() => setShowCouponModal(false)} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted cursor-pointer">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt/Order Detail Modal */}
      {receiptOrder && (() => {
        const statusInfo = statusMap[receiptOrder.status] || { label: receiptOrder.status, class: 'bg-muted text-muted-foreground border-border' }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setReceiptOrder(null)}>
            <div className="bg-background rounded-2xl max-w-5xl w-full max-h-[90vh] shadow-xl flex flex-col overflow-hidden" style={receiptStyle} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between gap-4 p-5 border-b border-border/50 shrink-0 cursor-move" onMouseDown={receiptMouseDown}>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">주문서</h3>
                    <Badge className={`text-xs border ${statusInfo.class}`}>{statusInfo.label}</Badge>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground mt-1">{receiptOrder.order_number || `PS-${receiptOrder.id}`}</p>
                </div>
                <button type="button" onClick={() => setReceiptOrder(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto bg-neutral-100 p-4 sm:p-6">
                <OrderReceiptDocument order={receiptOrder} profile={profile} className="rounded-sm" />
                {receiptOrder.refund_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                    <p className="text-xs font-semibold text-orange-700 mb-1">환불 문의 내용</p>
                    <p className="text-xs text-orange-600 whitespace-pre-wrap">{receiptOrder.refund_reason}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border/50 shrink-0">
                {receiptOrder.cash_receipt_url && (
                  <a
                    href={receiptOrder.cash_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted cursor-pointer"
                  >
                    현금영수증 확인
                  </a>
                )}
                {(receiptOrder.status === 'paid' || receiptOrder.status === 'completed') && (
                  <button type="button" onClick={() => printReceipt(receiptOrder)} className="px-4 py-2 text-xs font-medium border border-blue-300 text-primary rounded-lg hover:bg-primary/8 cursor-pointer">영수증 인쇄</button>
                )}
                <button type="button" onClick={() => setReceiptOrder(null)} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted cursor-pointer">닫기</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Bookmark Detail Modal */}
      {bookmarkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setBookmarkModal(null)}>
          <div className="bg-background rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-xl flex flex-col" style={bookmarkDragStyle} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-border/50 shrink-0 cursor-move" onMouseDown={bookmarkDragMouseDown}>
              <div className="flex-1 min-w-0">
                {bookmarkModal.type === 'announcement' ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${(bookmarkModal.data.end_date && new Date(bookmarkModal.data.end_date) < new Date()) || bookmarkModal.data.status === 'closed' ? 'bg-zinc-100 text-zinc-500' : 'bg-blue-50 text-blue-800'}`}>
                        {(bookmarkModal.data.end_date && new Date(bookmarkModal.data.end_date) < new Date()) || bookmarkModal.data.status === 'closed' ? '마감' : '공고'}
                      </span>
                      {bookmarkModal.data.organization && <span className="text-xs text-muted-foreground">{bookmarkModal.data.organization}</span>}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">{bookmarkModal.data.title}</h3>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${catColor(bookmarkModal.data.category)}`}>{catLabel(bookmarkModal.data.category)}</span>
                      {bookmarkModal.data.source_name && <span className="text-xs text-muted-foreground">{bookmarkModal.data.source_name}</span>}
                    </div>
                    <h3 className="text-lg font-semibold leading-snug">{bookmarkModal.data.title}</h3>
                  </>
                )}
              </div>
              <button type="button" onClick={() => setBookmarkModal(null)} className="text-muted-foreground hover:text-foreground cursor-pointer shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {bookmarkModal.type === 'announcement' ? (
                <>
                  {(bookmarkModal.data.start_date || bookmarkModal.data.end_date) && (
                    <div className="mb-4 text-xs text-muted-foreground">
                      {bookmarkModal.data.start_date && <span>시작: {formatDate(bookmarkModal.data.start_date)}</span>}
                      {bookmarkModal.data.start_date && bookmarkModal.data.end_date && <span className="mx-2">·</span>}
                      {bookmarkModal.data.end_date && <span>마감: {formatDate(bookmarkModal.data.end_date)}</span>}
                    </div>
                  )}
                  {bookmarkModal.data.description ? (
                    <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed">{bookmarkModal.data.description}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">상세 내용이 없습니다.</p>
                  )}
                </>
              ) : (
                <>
                  {bookmarkModal.data.created_at && (
                    <div className="mb-4 text-xs text-muted-foreground">게시일: {formatDate(bookmarkModal.data.created_at)}</div>
                  )}
                  {bookmarkModal.data.content ? (
                    <div className="prose prose-sm max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed">{bookmarkModal.data.content}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground">상세 내용이 없습니다.</p>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border/50 shrink-0">
              {bookmarkModal.type === 'announcement' && bookmarkModal.data.source_url ? (
                <a href={bookmarkModal.data.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> 원문 보기
                </a>
              ) : bookmarkModal.type === 'feed' && bookmarkModal.data.external_url ? (
                <a href={bookmarkModal.data.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> 원문 보기
                </a>
              ) : <div />}
              <button type="button" onClick={() => setBookmarkModal(null)} className="px-4 py-2 text-xs font-medium border border-border rounded-lg hover:bg-muted cursor-pointer">닫기</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundOrderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => { setRefundOrderId(null); setRefundReason('') }}>
          <div className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl" style={refundStyle} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 cursor-move" onMouseDown={refundMouseDown}><h3 className="text-lg font-semibold">환불 문의</h3><button type="button" onClick={() => { setRefundOrderId(null); setRefundReason('') }} className="text-muted-foreground hover:text-foreground cursor-pointer"><X className="w-5 h-5" /></button></div>
            <p className="text-sm text-muted-foreground mb-4">환불 사유를 입력해주세요.</p>
            <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={4} placeholder="환불 사유를 상세히 입력해주세요..." className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-4" />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setRefundOrderId(null); setRefundReason('') }} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted cursor-pointer">취소</button>
              <button type="button" disabled={refundSubmitting || !refundReason.trim()} onClick={() => handleRefundRequest(refundOrderId, refundReason.trim())} className="flex-1 h-10 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 cursor-pointer disabled:opacity-50">{refundSubmitting ? '접수 중...' : '문의 접수'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
