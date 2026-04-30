'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useDraggableModal } from '@/hooks/useDraggableModal'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  X,
  User,
  Mail,
  Phone,
  Building,
  Shield,
  ShoppingCart,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  StickyNote,
  Package,
  Download,
  FileText,
  CreditCard,
  Clock,
  Hash,
  CheckCircle,
  XCircle,
  RotateCcw,
  ChevronDown,
} from 'lucide-react'

// ===========================
// Types
// ===========================

interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  company: string | null
  role: string
  created_at: string
}

interface Product {
  title: string
  thumbnail_url: string | null
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  price: number
  products: Product | null
}

interface MemoEntry {
  text: string
  author: string
  created_at: string
}

interface Order {
  id: number
  order_number: string
  user_id: string
  status: string
  total_amount: number
  payment_method: string | null
  payment_key: string | null
  paid_at: string | null
  cancelled_at: string | null
  refund_reason: string | null
  admin_memo: unknown
  created_at: string
  updated_at: string | null
  order_items: OrderItem[]
  profiles: Profile | null
  coupon_code: string | null
  coupon_discount: number | null
  reward_discount: number | null
  tax_contact_info: string | null
  business_cert_url: string | null
  business_cert_name: string | null
  deposit_memo: string | null
  card_memo: string | null
}

function isMemoEntry(value: unknown): value is MemoEntry {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    typeof record.text === 'string' &&
    typeof record.author === 'string' &&
    typeof record.created_at === 'string'
  )
}

function parseMemos(raw: unknown): MemoEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(isMemoEntry)
  if (typeof raw === 'object') return []
  if (typeof raw !== 'string') return []

  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(isMemoEntry)
  } catch {
    // Legacy plain text memo → convert
    if (raw.trim()) return [{ text: raw, author: '관리자', created_at: new Date().toISOString() }]
  }
  return []
}

function stringifyMemos(memos: MemoEntry[]): string {
  return JSON.stringify(memos)
}

interface DownloadLogEntry {
  id: number
  user_id: string
  product_id: number
  file_name: string
  downloaded_at: string
}

interface ConsultingRequest {
  id: string
  user_id: string
  package_type: string
  message: string
  status: string
  created_at: string
}

// ===========================
// Constants
// ===========================

type StatusFilter = 'all' | 'pending' | 'pending_transfer' | 'paid' | 'cancelled' | 'refunded'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '결제대기' },
  { key: 'pending_transfer', label: '입금대기' },
  { key: 'paid', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'refunded', label: '환불' },
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: '결제대기', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  pending_transfer: { label: '입금대기', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  paid: { label: '결제완료', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { label: '취소', bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border' },
  refunded: { label: '환불', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '카드결제',
  bank_transfer: '무통장입금',
  virtual_account: '가상계좌',
  phone: '휴대폰결제',
  free: '무료',
  admin_grant: '관리자 지급',
}

// ===========================
// Helpers
// ===========================

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function formatDateTime(date: string) {
  return new Date(date).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatWon(amount: number) {
  return amount.toLocaleString('ko-KR') + '원'
}

function hasTaxInvoiceRequest(order: Pick<Order, 'payment_method' | 'tax_contact_info' | 'business_cert_url'>) {
  return order.payment_method !== 'card' && Boolean(order.tax_contact_info || order.business_cert_url)
}

function TaxInvoiceBadge({ order }: { order: Pick<Order, 'payment_method' | 'tax_contact_info' | 'business_cert_url'> }) {
  if (!hasTaxInvoiceRequest(order)) return null
  return (
    <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
      세금계산서 발행 필요
    </span>
  )
}

// ===========================
// Status Badge
// ===========================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <span className="text-xs text-muted-foreground">{status}</span>
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  )
}

// ===========================
// Confirm Modal (replaces window.confirm)
// ===========================

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string
  message: string
  confirmLabel: string
  confirmColor: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4" style={modalStyle}>
        <h3 className="text-sm font-semibold text-foreground mb-2 cursor-move" onMouseDown={handleMouseDown}>{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors disabled:opacity-50 cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${confirmColor}`}
          >
            {loading ? '처리 중...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Toast Notification
// ===========================

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-[80] bg-gray-900 text-white text-sm px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2 fade-in">
      <CheckCircle className="w-4 h-4 text-green-400" />
      {message}
    </div>
  )
}

// ===========================
// InfoRow (for member modal)
// ===========================

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground mb-0.5">{label}</p>
        <p className="text-sm font-medium text-foreground break-all">{value || '-'}</p>
      </div>
    </div>
  )
}

// ===========================
// Member Detail Modal
// ===========================

type MemberModalTab = 'info' | 'orders' | 'consulting'

function MemberDetailModal({
  member,
  onClose,
}: {
  member: Profile
  onClose: () => void
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [activeTab, setActiveTab] = useState<MemberModalTab>('info')
  const [orders, setOrders] = useState<Order[]>([])
  const [consulting, setConsulting] = useState<ConsultingRequest[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingConsulting, setLoadingConsulting] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  const loadMemberOrders = useCallback(async () => {
    setLoadingOrders(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select(
        `id, order_number, user_id, status, total_amount, created_at,
         order_items ( id, order_id, product_id, price, products ( title, thumbnail_url ) )`
      )
      .eq('user_id', member.id)
      .order('created_at', { ascending: false })
      .limit(200)
    setOrders((data as unknown as Order[]) || [])
    setLoadingOrders(false)
  }, [member.id])

  const loadMemberConsulting = useCallback(async () => {
    setLoadingConsulting(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('consulting_requests')
      .select('id, user_id, package_type, message, status, created_at')
      .eq('user_id', member.id)
      .order('created_at', { ascending: false })
    setConsulting((data as ConsultingRequest[]) || [])
    setLoadingConsulting(false)
  }, [member.id])

  const handleTabChange = useCallback((tab: MemberModalTab) => {
    setActiveTab(tab)
    if (tab === 'orders' && orders.length === 0 && !loadingOrders) {
      void loadMemberOrders()
    }
    if (tab === 'consulting' && consulting.length === 0 && !loadingConsulting) {
      void loadMemberConsulting()
    }
  }, [
    consulting.length,
    loadMemberConsulting,
    loadMemberOrders,
    loadingConsulting,
    loadingOrders,
    orders.length,
  ])

  const tabs: { key: MemberModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: '회원정보', icon: <User className="w-3.5 h-3.5" /> },
    { key: 'orders', label: '주문내역', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: 'consulting', label: '문의내역', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[5vh] pb-[5vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 cursor-move" onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {(member.name || '?')[0]}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{member.name || '(이름 없음)'}</h2>
              <p className="text-xs text-muted-foreground">{member.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/50 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-blue-600 text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="bg-muted rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
                <InfoRow icon={<User className="w-4 h-4" />} label="이름" value={member.name || '-'} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label="이메일" value={member.email} />
                <InfoRow icon={<Phone className="w-4 h-4" />} label="연락처" value={member.phone || '-'} />
                <InfoRow icon={<Building className="w-4 h-4" />} label="회사" value={member.company || '-'} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="가입일" value={formatDateTime(member.created_at)} />
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div>
              {loadingOrders ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">주문 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-muted rounded-xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-muted-foreground">{order.order_number}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm mb-1">
                          <span className="text-foreground">{item.products?.title || '상품명 없음'}</span>
                          <span className="text-muted-foreground font-medium">{formatWon(item.price)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-end pt-2 border-t border-border/60 mt-2">
                        <span className="text-sm font-semibold text-foreground">합계 {formatWon(order.total_amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'consulting' && (
            <div>
              {loadingConsulting ? (
                <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
              ) : consulting.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">문의 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consulting.map((req) => (
                    <div key={req.id} className="bg-muted rounded-xl p-4 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-primary/8 text-primary border border-primary/20">{req.package_type}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(req.created_at)}</span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{req.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ===========================
// Business Cert Download Link
// ===========================
function BusinessCertLink({ path, fileName }: { path: string; fileName: string | null }) {
  const [loading, setLoading] = useState(false)
  const handleDownload = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.storage
        .from('business-certs')
        .createSignedUrl(path, 60)
      if (error || !data?.signedUrl) {
        alert('파일 다운로드 링크 생성에 실패했습니다.')
        return
      }
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      console.error(err)
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-white hover:bg-muted/50 transition-colors cursor-pointer text-sm disabled:opacity-50"
    >
      <Download className="w-4 h-4 text-primary" />
      <span className="text-foreground">{fileName || '사업자등록증'}</span>
      {loading && <span className="text-xs text-muted-foreground">로딩...</span>}
    </button>
  )
}

// ===========================
// Order Detail Modal
// ===========================

function OrderDetailModal({
  order,
  downloadLogs,
  onClose,
  onStatusChange,
  onMemoSave,
}: {
  order: Order
  downloadLogs: DownloadLogEntry[]
  onClose: () => void
  onStatusChange: (orderId: number, status: string) => Promise<void>
  onMemoSave: (orderId: number, memo: string) => Promise<void>
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [memos, setMemos] = useState<MemoEntry[]>(parseMemos(order.admin_memo))
  const [newMemo, setNewMemo] = useState('')
  const [memoSaving, setMemoSaving] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ status: string; label: string; color: string } | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // download logs for this order's products
  const orderProductIds = useMemo(
    () => order.order_items?.map((item) => Number(item.product_id)) || [],
    [order.order_items]
  )
  const orderDownloads = useMemo(
    () => downloadLogs.filter((log) => log.user_id === order.user_id && orderProductIds.includes(log.product_id)),
    [downloadLogs, order.user_id, orderProductIds]
  )

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmAction) setConfirmAction(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose, confirmAction])

  const handleMemoAdd = async () => {
    if (!newMemo.trim()) return
    setMemoSaving(true)
    const entry: MemoEntry = {
      text: newMemo.trim(),
      author: '관리자',
      created_at: new Date().toISOString(),
    }
    const updated = [...memos, entry]
    await onMemoSave(order.id, stringifyMemos(updated))
    setMemos(updated)
    setNewMemo('')
    setMemoSaving(false)
  }

  const handleMemoDelete = async (index: number) => {
    const updated = memos.filter((_, i) => i !== index)
    await onMemoSave(order.id, stringifyMemos(updated))
    setMemos(updated)
  }

  const handleStatusConfirm = async () => {
    if (!confirmAction) return
    setActionLoading(true)
    await onStatusChange(order.id, confirmAction.status)
    setActionLoading(false)
    setConfirmAction(null)
  }

  const profile = order.profiles

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] pb-[3vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[94vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 cursor-move" onMouseDown={handleMouseDown}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/8 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">주문 상세</h2>
              <p className="text-xs text-muted-foreground font-mono">{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 주문 기본정보 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">주문 기본정보</h3>
            <div className="bg-muted rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">주문번호</p>
                  <p className="text-sm font-mono font-medium text-foreground">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">주문일시</p>
                  <p className="text-sm font-medium text-foreground">{formatDateTime(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">결제상태</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          </div>

          {/* 주문 상품 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">주문 상품</h3>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.products?.thumbnail_url ? (
                    <img
                      src={item.products.thumbnail_url}
                      alt="상품 이미지"
                      className="w-10 h-10 rounded-xl object-cover bg-muted shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.products?.title || '상품명 없음'}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground shrink-0">{formatWon(item.price)}</span>
                </div>
              ))}
              <div className="flex items-center justify-end pt-3 border-t border-border/60">
                <span className="text-sm font-bold text-foreground">합계 {formatWon(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">결제 정보</h3>
            <div className="bg-muted rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">총 결제금액</p>
                  <p className="text-sm font-bold text-foreground">{formatWon(order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">결제방법</p>
                  <p className="text-sm font-medium text-foreground">
                    {PAYMENT_METHOD_LABEL[order.payment_method || ''] || order.payment_method || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">결제일시</p>
                  <p className="text-sm font-medium text-foreground">{order.paid_at ? formatDateTime(order.paid_at) : '-'}</p>
                </div>
              </div>
              {order.refund_reason && (
                <div className="mt-3 pt-3 border-t border-border/60">
                  <p className="text-[11px] text-muted-foreground mb-1">환불 사유</p>
                  <p className="text-sm text-red-600">{order.refund_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* 다운로드 이력 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              다운로드 이력 ({orderDownloads.length}건)
            </h3>
            <div className="bg-muted rounded-xl p-4">
              {orderDownloads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">다운로드 기록이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {orderDownloads.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-foreground">{log.file_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDateTime(log.downloaded_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 주문자 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">주문자 정보</h3>
            <div className="bg-muted rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">이름</p>
                  <p className="text-sm font-medium text-foreground">{profile?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">이메일</p>
                  <p className="text-sm font-medium text-foreground">{profile?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">연락처</p>
                  <p className="text-sm font-medium text-foreground">{profile?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">회사</p>
                  <p className="text-sm font-medium text-foreground">{profile?.company || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 세금계산서/추가 정보 */}
          {(order.tax_contact_info || order.business_cert_url || order.deposit_memo || order.card_memo || order.coupon_code) && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">세금계산서 / 추가 정보</h3>
                <TaxInvoiceBadge order={order} />
              </div>
              <div className="bg-muted rounded-xl p-4 space-y-4">
                {order.coupon_code && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">적용 쿠폰</p>
                    <p className="text-sm font-medium text-foreground">
                      {order.coupon_code}
                      {order.coupon_discount ? <span className="text-blue-700 ml-2">(-{formatWon(order.coupon_discount)})</span> : null}
                    </p>
                  </div>
                )}
                {(order.reward_discount ?? 0) > 0 && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">사용 적립금</p>
                    <p className="text-sm font-medium text-blue-700">-{formatWon(order.reward_discount || 0)}</p>
                  </div>
                )}
                {order.tax_contact_info && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">세금계산서 담당자 정보</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{order.tax_contact_info}</p>
                  </div>
                )}
                {order.business_cert_url && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">사업자등록증</p>
                    <BusinessCertLink path={order.business_cert_url} fileName={order.business_cert_name} />
                  </div>
                )}
                {order.deposit_memo && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">무통장 입금 메모</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{order.deposit_memo}</p>
                  </div>
                )}
                {order.card_memo && (
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-1">카드 결제 메모</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{order.card_memo}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 관리자 메모 (댓글형) */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">관리자 메모</h3>
            <div className="bg-muted rounded-xl p-4 space-y-3">
              {/* 기존 메모 목록 */}
              {memos.length > 0 ? (
                <div className="space-y-2">
                  {memos.map((entry, idx) => (
                    <div key={idx} className="bg-white border border-border rounded-xl px-3 py-2.5 group">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{entry.author}</span>
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(entry.created_at).toLocaleString('ko-KR', {
                              year: 'numeric', month: '2-digit', day: '2-digit',
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleMemoDelete(idx)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                          title="삭제"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{entry.text}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">메모가 없습니다</p>
              )}

              {/* 새 메모 입력 */}
              <div className="flex gap-2">
                <textarea
                  value={newMemo}
                  onChange={(e) => setNewMemo(e.target.value)}
                  placeholder="메모를 입력하세요..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleMemoAdd()
                    }
                  }}
                  className="flex-1 text-sm text-foreground bg-white border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                <button
                  onClick={handleMemoAdd}
                  disabled={memoSaving || !newMemo.trim()}
                  className="self-end px-3 py-2 text-xs font-medium text-white bg-gray-900 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                >
                  {memoSaving ? '저장...' : '등록'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Ctrl+Enter로 빠른 등록</p>
            </div>
          </div>

          {/* 상태 변경 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">상태 변경</h3>
            <div className="bg-muted rounded-xl p-4 flex flex-wrap gap-2">
              {(order.status === 'pending' || order.status === 'pending_transfer') && (
                <>
                  <button
                    onClick={() => setConfirmAction({ status: 'paid', label: order.status === 'pending_transfer' || order.payment_method === 'bank_transfer' ? '입금 승인' : '결제확인', color: 'bg-green-600 hover:bg-green-700' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {order.status === 'pending_transfer' || order.payment_method === 'bank_transfer' ? '입금 승인' : '결제확인'}
                  </button>
                  <button
                    onClick={() => setConfirmAction({ status: 'cancelled', label: '취소', color: 'bg-gray-600 hover:bg-gray-700' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-muted0 rounded-xl hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    주문 취소
                  </button>
                </>
              )}
              {order.status === 'paid' && (
                <button
                  onClick={() => setConfirmAction({ status: 'refunded', label: '환불', color: 'bg-red-600 hover:bg-red-700' })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  환불 처리
                </button>
              )}
              {(order.status === 'cancelled' || order.status === 'refunded') && (
                <p className="text-sm text-muted-foreground">변경 가능한 상태가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status change confirm */}
      {confirmAction && (
        <ConfirmModal
          title="주문 상태 변경"
          message={`이 주문을 "${confirmAction.label}" 상태로 변경하시겠습니까?`}
          confirmLabel={confirmAction.label}
          confirmColor={confirmAction.color}
          onConfirm={handleStatusConfirm}
          onCancel={() => setConfirmAction(null)}
          loading={actionLoading}
        />
      )}
    </div>
  )
}

// ===========================
// Product Purchase History Modal
// ===========================

interface PurchaseHistoryEntry {
  orderer_name: string
  orderer_email: string
  ordered_at: string
  total_amount: number
  status: string
}

function ProductPurchaseHistoryModal({
  productId,
  productTitle,
  onClose,
}: {
  productId: string
  productTitle: string
  onClose: () => void
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [entries, setEntries] = useState<PurchaseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      // Get all order_items for this product
      const { data: items } = await supabase
        .from('order_items')
        .select('order_id, price')
        .eq('product_id', productId)

      if (!items || items.length === 0) {
        setEntries([])
        setLoading(false)
        return
      }

      const orderIds = [...new Set(items.map((i) => i.order_id))]
      const { data: ordersData } = await supabase
        .from('orders')
        .select('id, user_id, status, total_amount, created_at')
        .in('id', orderIds)
        .order('created_at', { ascending: false })

      if (!ordersData || ordersData.length === 0) {
        setEntries([])
        setLoading(false)
        return
      }

      const userIds = [...new Set(ordersData.map((o) => o.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, name')
        .in('id', userIds)

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      const result: PurchaseHistoryEntry[] = ordersData.map((o) => {
        const p = profileMap.get(o.user_id)
        return {
          orderer_name: p?.name || '-',
          orderer_email: p?.email || '-',
          ordered_at: o.created_at,
          total_amount: o.total_amount,
          status: o.status,
        }
      })

      setEntries(result)
      setLoading(false)
    }
    fetchData()
  }, [productId])

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 cursor-move" onMouseDown={handleMouseDown}>
          <div>
            <h2 className="text-base font-semibold text-foreground">구매내역</h2>
            <p className="text-xs text-muted-foreground break-words mt-0.5">{productTitle}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">구매 내역이 없습니다</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">주문자</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">이메일</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">주문일</th>
                  <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">결제금액</th>
                  <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">결제상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map((entry, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="px-3 py-2 text-foreground">{entry.orderer_name}</td>
                    <td className="px-3 py-2 text-muted-foreground">{entry.orderer_email}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.ordered_at)}</td>
                    <td className="px-3 py-2 text-right text-foreground font-medium">{formatWon(entry.total_amount)}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={entry.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ===========================
// Download History Modal
// ===========================

interface DownloadHistoryRow {
  downloaded_at: string
  user_name: string
  product_title: string
  file_name: string
}

function DownloadHistoryModal({
  order,
  onClose,
}: {
  order: Order
  onClose: () => void
}) {
  const { handleMouseDown, modalStyle } = useDraggableModal()
  const [rows, setRows] = useState<DownloadHistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const productIds = (order.order_items || []).map((item) => Number(item.product_id))
      if (productIds.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      const { data: logs } = await supabase
        .from('download_logs')
        .select('*')
        .eq('user_id', order.user_id)
        .in('product_id', productIds)
        .order('downloaded_at', { ascending: false })
        .limit(500)

      if (!logs || logs.length === 0) {
        setRows([])
        setLoading(false)
        return
      }

      // Get user profiles
      const userIds = [...new Set(logs.map((l) => l.user_id).filter(Boolean))]
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      const profileMap = new Map((profiles || []).map((p) => [p.id, p]))

      // Get product titles
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .in('id', productIds)
      const productMap = new Map((products || []).map((p) => [p.id, p.title]))

      const result: DownloadHistoryRow[] = logs.map((log) => {
        const profile = profileMap.get(log.user_id)
        return {
          downloaded_at: log.downloaded_at,
          user_name: profile?.name || profile?.email || '-',
          product_title: productMap.get(log.product_id) || '-',
          file_name: log.file_name || '-',
        }
      })

      setRows(result)
      setLoading(false)
    }
    fetchData()
  }, [order])

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden" style={modalStyle}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0 cursor-move" onMouseDown={handleMouseDown}>
          <div>
            <h2 className="text-base font-semibold text-foreground">다운로드 이력</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{order.order_number}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">불러오는 중...</div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <Download className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">다운로드 기록이 없습니다</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">다운로드 일시</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">사용자</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">상품명</th>
                  <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">파일명</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/50">
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatDateTime(row.downloaded_at)}</td>
                    <td className="px-3 py-2 text-foreground">{row.user_name}</td>
                    <td className="px-3 py-2 text-foreground break-words">{row.product_title}</td>
                    <td className="px-3 py-2 text-muted-foreground break-all">{row.file_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ===========================
// Main Page
// ===========================

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageSize, setPageSize] = useState(100)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false)

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [purchaseHistoryProduct, setPurchaseHistoryProduct] = useState<{ id: string; title: string } | null>(null)
  const [downloadHistoryOrder, setDownloadHistoryOrder] = useState<Order | null>(null)
  const [listConfirmAction, setListConfirmAction] = useState<{ orderId: number; status: string; label: string; message: string; color: string } | null>(null)
  const [listActionLoading, setListActionLoading] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const bulkRef = useRef<HTMLDivElement>(null)

  // Close bulk dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bulkRef.current && !bulkRef.current.contains(e.target as Node)) {
        setBulkDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadData() {
    setLoading(true)
    setLoadError(null)
    try {
      const supabase = createClient()

      // Fetch orders + items (no FK join for profiles)
      const ordersResult = await supabase
        .from('orders')
        .select(
          `id, order_number, user_id, status, total_amount, payment_method, payment_key, paid_at, cancelled_at, refund_reason, admin_memo, created_at, updated_at,
           coupon_code, coupon_discount, reward_discount, tax_contact_info, business_cert_url, business_cert_name, deposit_memo, card_memo,
           order_items ( id, order_id, product_id, price, products ( title, thumbnail_url ) )`
        )
        .order('created_at', { ascending: false })
        .limit(10000)

      if (ordersResult.error) throw ordersResult.error

      const orderList: Order[] = ((ordersResult.data as unknown as Order[]) || []).map((order): Order => ({
        ...order,
        order_number: order.order_number || `ORDER-${order.id}`,
        status: order.status || 'pending',
        total_amount: Number(order.total_amount || 0),
        order_items: Array.isArray(order.order_items) ? order.order_items : [],
        profiles: null,
      }))

      // Fetch profiles separately by user_ids
      const userIds = [...new Set(orderList.map(o => o.user_id).filter(Boolean))]
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, email, name, phone, company, role, created_at')
          .in('id', userIds)
        if (profilesError) throw profilesError
        if (profilesData) {
          const profileMap = new Map(profilesData.map(p => [p.id, p]))
          orderList.forEach(o => {
            o.profiles = (profileMap.get(o.user_id) as Profile | undefined) || null
          })
        }
      }

      const logsResult = await supabase
        .from('download_logs')
        .select('*')
        .order('downloaded_at', { ascending: false })
        .limit(20000)

      if (logsResult.error) throw logsResult.error

      setOrders(orderList)
      setDownloadLogs((logsResult.data as DownloadLogEntry[]) || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : '주문 목록을 불러오지 못했습니다.'
      console.error('[admin/orders] load failed', error)
      setOrders([])
      setDownloadLogs([])
      setLoadError(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  // Status change handler
  const handleStatusChange = useCallback(async (orderId: number, status: string) => {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    const payload = (await res.json().catch(() => null)) as
      | { success?: boolean; updates?: Record<string, unknown>; error?: string }
      | null
    if (!res.ok || !payload?.success || !payload.updates) {
      setToast(`주문 상태 변경 실패: ${payload?.error ?? '알 수 없는 오류'}`)
      return
    }
    const updates = payload.updates

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } as Order : o))
    )
    // Refresh the selected order if it's the one we changed
    setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, ...updates } as Order : prev))
    setToast('주문 상태가 변경되었습니다')
  }, [])

  const handleListStatusConfirm = useCallback(async () => {
    if (!listConfirmAction) return
    setListActionLoading(true)
    await handleStatusChange(listConfirmAction.orderId, listConfirmAction.status)
    setListActionLoading(false)
    setListConfirmAction(null)
  }, [handleStatusChange, listConfirmAction])

  // Memo save handler
  const handleMemoSave = useCallback(async (orderId: number, memo: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('orders').update({ admin_memo: memo, updated_at: new Date().toISOString() }).eq('id', orderId)
    if (error) { setToast(`메모 저장 실패: ${error.message}`); return }
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, admin_memo: memo } : o))
    )
    setToast('메모가 저장되었습니다')
  }, [])

  // Bulk status change
  const handleBulkStatusChange = useCallback(async (status: string) => {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    const results = await Promise.all(ids.map(async (id) => {
      const res = await fetch(`/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const payload = (await res.json().catch(() => null)) as
        | { success?: boolean; updates?: Record<string, unknown>; error?: string }
        | null
      return { id, ok: res.ok && payload?.success === true, updates: payload?.updates }
    }))
    const failed = results.filter((result) => !result.ok)
    if (failed.length > 0) {
      setToast(`일괄 상태 변경 실패: ${failed.length}건`)
      return
    }

    setOrders((prev) =>
      prev.map((o) => {
        const result = results.find((r) => r.id === o.id)
        return result?.updates ? { ...o, ...result.updates } as Order : o
      })
    )
    setSelectedIds(new Set())
    setBulkDropdownOpen(false)
    setToast(`${ids.length}건의 주문 상태가 변경되었습니다`)
  }, [selectedIds])

  // Download count map: { `${user_id}_${product_id}`: count }
  const downloadCountMap = useMemo(() => {
    const map: Record<string, number> = {}
    for (const log of downloadLogs) {
      const key = `${log.user_id}_${log.product_id}`
      map[key] = (map[key] || 0) + 1
    }
    return map
  }, [downloadLogs])

  function getOrderDownloadCount(order: Order): number {
    let count = 0
    for (const item of order.order_items || []) {
      const key = `${order.user_id}_${item.product_id}`
      count += downloadCountMap[key] || 0
    }
    return count
  }

  // Filter + Search
  const filtered = useMemo(() => {
    let result = orders

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((o) => o.status === statusFilter)
    }

    // Date range
    if (dateFrom) {
      const from = new Date(dateFrom)
      result = result.filter((o) => new Date(o.created_at) >= from)
    }
    if (dateTo) {
      const to = new Date(dateTo)
      to.setHours(23, 59, 59, 999)
      result = result.filter((o) => new Date(o.created_at) <= to)
    }

    // Search (order number, name, email, product name)
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (o) =>
          (o.order_number || '').toLowerCase().includes(q) ||
          (o.profiles?.name || '').toLowerCase().includes(q) ||
          (o.profiles?.email || '').toLowerCase().includes(q) ||
          (o.order_items || []).some((item) =>
            (item.products?.title || '').toLowerCase().includes(q)
          )
      )
    }

    return result
  }, [orders, statusFilter, search, dateFrom, dateTo])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length, pending: 0, pending_transfer: 0, paid: 0, cancelled: 0, refunded: 0 }
    for (const o of orders) {
      if (counts[o.status] !== undefined) counts[o.status]++
    }
    return counts
  }, [orders])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Excel download
  const handleExcelDownload = useCallback(() => {
    const target = selectedIds.size > 0
      ? filtered.filter((o) => selectedIds.has(o.id))
      : filtered

    const header = '주문번호,주문일시,주문자,이메일,연락처,상품,총결제금액,결제방법,결제상태'
    const rows = target.map((o) => {
      const p = o.profiles
      const items = o.order_items?.map((i) => i.products?.title || '').join(' / ') || ''
      const statusLabel = STATUS_CONFIG[o.status]?.label || o.status
      const paymentLabel = PAYMENT_METHOD_LABEL[o.payment_method || ''] || o.payment_method || ''
      return [
        o.order_number,
        formatDateTime(o.created_at),
        p?.name || '',
        p?.email || '',
        p?.phone || '',
        `"${items}"`,
        o.total_amount,
        paymentLabel,
        statusLabel,
      ].join(',')
    })

    const bom = '\uFEFF'
    const csv = bom + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `orders_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }, [filtered, selectedIds])

  // Selection helpers
  const allPageSelected = paged.length > 0 && paged.every((o) => selectedIds.has(o.id))

  function toggleAll() {
    if (allPageSelected) {
      const next = new Set(selectedIds)
      paged.forEach((o) => next.delete(o.id))
      setSelectedIds(next)
    } else {
      const next = new Set(selectedIds)
      paged.forEach((o) => next.add(o.id))
      setSelectedIds(next)
    }
  }

  function toggleOne(id: number) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">주문 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            전체 {orders.length}건의 주문을 관리합니다
          </p>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-border p-1 mb-4 inline-flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setStatusFilter(tab.key)
                setCurrentPage(1)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  statusFilter === tab.key ? 'text-muted-foreground' : 'text-muted-foreground'
                }`}
              >
                {statusCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  placeholder="주문번호, 주문자, 이메일, 상품명"
                  className="w-full pl-9 pr-8 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('')
                      setCurrentPage(1)
                      searchRef.current?.focus()
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Date range */}
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:border-primary"
                />
                <span className="text-muted-foreground text-sm">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-primary/8 border border-primary/20 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-primary">선택 {selectedIds.size}건</span>
            <div className="flex items-center gap-2">
              {/* Bulk status change */}
              <div className="relative" ref={bulkRef}>
                <button
                  onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-white border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
                >
                  상태 일괄 변경
                  <ChevronDown className="w-3 h-3" />
                </button>
                {bulkDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-border py-1 z-10 min-w-[120px]">
                    {(['paid', 'cancelled', 'refunded'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleBulkStatusChange(s)}
                        className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted cursor-pointer"
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Excel download */}
              <button
                onClick={handleExcelDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary bg-white border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                엑셀 다운로드
              </button>

              {/* Clear selection */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-primary hover:text-primary cursor-pointer"
              >
                <X className="w-3 h-3" />
                선택 해제
              </button>
            </div>
          </div>
        )}

        {/* Excel download button when no selection */}
        {selectedIds.size === 0 && filtered.length > 0 && !loading && (
          <div className="flex justify-end mb-4">
            <button
              onClick={handleExcelDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground bg-white border border-border rounded-xl hover:bg-muted transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              엑셀 다운로드
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    주문정보
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    품목·가격·수량
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    결제 정보
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    다운로드
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    수령인 정보·메모
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-border border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">주문 목록을 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : loadError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <XCircle className="w-10 h-10 text-red-200 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-foreground mb-1">주문 목록을 불러오지 못했습니다</p>
                      <p className="text-xs text-muted-foreground mb-4">{loadError}</p>
                      <button
                        type="button"
                        onClick={() => void loadData()}
                        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer"
                      >
                        다시 시도
                      </button>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {search || dateFrom || dateTo ? '검색 결과가 없습니다' : '주문 내역이 없습니다'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((order) => {
                    const profile = order.profiles
                    const dlCount = getOrderDownloadCount(order)
                    return (
                      <tr key={order.id} className="hover:bg-primary/8/30 transition-colors">
                        {/* Checkbox */}
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleOne(order.id)}
                            className="w-4 h-4 rounded border-border text-primary cursor-pointer"
                          />
                        </td>

                        {/* 주문정보 */}
                        <td className="px-4 py-4 align-top min-w-[220px]">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-sm font-mono text-primary hover:text-primary hover:underline mb-1 cursor-pointer text-left"
                          >
                            {order.order_number}
                          </button>
                          <p className="text-xs text-muted-foreground mb-2">{formatDateTime(order.created_at)}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (profile) setSelectedMember(profile)
                              }}
                              className="text-sm font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                            >
                              {profile?.name || '-'}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground">{profile?.email || '-'}</p>
                          <p className="text-xs text-muted-foreground">{profile?.phone || '-'}</p>
                        </td>

                        {/* 품목 / 가격 */}
                        <td className="px-4 py-4 align-top min-w-[300px]">
                          <div className="space-y-2">
                            {order.order_items?.map((item) => (
                              <div key={item.id} className="flex items-start gap-2">
                                {item.products?.thumbnail_url ? (
                                  <img
                                    src={item.products.thumbnail_url}
                                    alt="상품 이미지"
                                    className="w-8 h-8 rounded object-cover bg-muted shrink-0 mt-0.5"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0 mt-0.5">
                                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start gap-1.5">
                                    <a
                                      href={`/store/${item.product_id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sm text-primary hover:underline break-words"
                                    >
                                      {item.products?.title || '상품명 없음'}
                                    </a>
                                    <button
                                      onClick={() => setPurchaseHistoryProduct({ id: item.product_id, title: item.products?.title || '상품명 없음' })}
                                      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer whitespace-nowrap"
                                    >
                                      구매내역
                                    </button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{formatWon(item.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 결제 정보 */}
                        <td className="px-4 py-4 align-top min-w-[160px]">
                          <StatusBadge status={order.status} />
                          <div className="mt-1">
                            <TaxInvoiceBadge order={order} />
                          </div>
                          <div className="mt-2 space-y-0.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>상품 금액</span>
                              <span>{formatWon(order.order_items?.reduce((sum, i) => sum + i.price, 0) || 0)}</span>
                            </div>
                            {(order.reward_discount ?? 0) > 0 && (
                              <div className="flex justify-between text-xs text-blue-700">
                                <span>적립금 사용</span>
                                <span>-{formatWon(order.reward_discount || 0)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-semibold text-foreground pt-1 border-t border-border/50 mt-1">
                              <span>총 결제 금액</span>
                              <span>{formatWon(order.total_amount)}</span>
                            </div>
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            {PAYMENT_METHOD_LABEL[order.payment_method || ''] || order.payment_method || '-'}
                          </p>
                          {order.status === 'pending_transfer' && (
                            <button
                              type="button"
                              onClick={() => setListConfirmAction({
                                orderId: order.id,
                                status: 'paid',
                                label: '입금 승인',
                                message: `${order.order_number} 주문의 입금을 확인하고 다운로드 권한을 열겠습니까?`,
                                color: 'bg-green-600 hover:bg-green-700',
                              })}
                              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-green-700 cursor-pointer"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              입금 승인
                            </button>
                          )}
                        </td>

                        {/* 다운로드 */}
                        <td className="px-4 py-4 align-top text-center">
                          {dlCount > 0 ? (
                            <button
                              onClick={() => setDownloadHistoryOrder(order)}
                              className="text-sm font-medium text-primary hover:underline cursor-pointer"
                            >
                              {dlCount}회
                            </button>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground">-</span>
                          )}
                        </td>

                        {/* 수령인 정보·메모 */}
                        <td className="px-4 py-4 align-top min-w-[220px]">
                          <p className="text-sm font-medium text-foreground">{profile?.name || '-'}</p>
                          <p className="text-xs text-muted-foreground mb-2">{profile?.phone || '-'}</p>
                          {/* 기존 메모 표시 (최근 2개) */}
                          {(() => {
                            const memos = parseMemos(order.admin_memo)
                            return memos.slice(-2).map((m, idx) => (
                              <div key={idx} className="bg-muted rounded px-2 py-1 mb-1">
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{m.text}</p>
                                <p className="text-[10px] text-muted-foreground">{m.author} · {formatDate(m.created_at)}</p>
                              </div>
                            ))
                          })()}
                          {/* 인라인 메모 입력 */}
                          <div className="flex gap-1 mt-1">
                            <input
                              type="text"
                              placeholder="메모 입력"
                              className="flex-1 text-xs border border-border rounded px-2 py-1 focus:outline-none focus:border-blue-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                  const input = e.target as HTMLInputElement
                                  handleMemoSave(order.id, input.value.trim())
                                  input.value = ''
                                }
                              }}
                            />
                            <button
                              onClick={(e) => {
                                const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement
                                if (input?.value.trim()) {
                                  handleMemoSave(order.id, input.value.trim())
                                  input.value = ''
                                }
                              }}
                              className="text-[11px] px-2 py-1 bg-muted text-muted-foreground rounded hover:bg-muted cursor-pointer shrink-0"
                            >
                              등록
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/50">
              <p className="text-xs text-muted-foreground">
                총 {filtered.length}건 중 {(safePage - 1) * pageSize + 1}-
                {Math.min(safePage * pageSize, filtered.length)}건
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages) return true
                    if (Math.abs(p - safePage) <= 2) return true
                    return false
                  })
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                      acc.push('ellipsis')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-muted-foreground">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                          safePage === item
                            ? 'bg-gray-900 text-white'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          downloadLogs={downloadLogs}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onMemoSave={handleMemoSave}
        />
      )}

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}

      {/* Product Purchase History Modal */}
      {purchaseHistoryProduct && (
        <ProductPurchaseHistoryModal
          productId={purchaseHistoryProduct.id}
          productTitle={purchaseHistoryProduct.title}
          onClose={() => setPurchaseHistoryProduct(null)}
        />
      )}

      {/* Download History Modal */}
      {downloadHistoryOrder && (
        <DownloadHistoryModal
          order={downloadHistoryOrder}
          onClose={() => setDownloadHistoryOrder(null)}
        />
      )}

      {listConfirmAction && (
        <ConfirmModal
          title="입금 승인"
          message={listConfirmAction.message}
          confirmLabel={listConfirmAction.label}
          confirmColor={listConfirmAction.color}
          onConfirm={handleListStatusConfirm}
          onCancel={() => setListConfirmAction(null)}
          loading={listActionLoading}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
