'use client'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
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
  admin_memo: string | null
  created_at: string
  updated_at: string | null
  order_items: OrderItem[]
  profiles: Profile | null
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

type StatusFilter = 'all' | 'pending' | 'paid' | 'cancelled' | 'refunded'

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'pending', label: '결제대기' },
  { key: 'paid', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'refunded', label: '환불' },
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: '결제대기', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  paid: { label: '결제완료', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { label: '취소', bg: 'bg-gray-100', text: 'text-gray-500', border: 'border-gray-200' },
  refunded: { label: '환불', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '카드결제',
  bank_transfer: '무통장입금',
  virtual_account: '가상계좌',
  phone: '휴대폰결제',
  free: '무료',
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

// ===========================
// Status Badge
// ===========================

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status]
  if (!config) return <span className="text-xs text-gray-500">{status}</span>
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
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50 cursor-pointer ${confirmColor}`}
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
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-all">{value || '-'}</p>
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

  useEffect(() => {
    if (activeTab === 'orders' && orders.length === 0 && !loadingOrders) {
      setLoadingOrders(true)
      const supabase = createClient()
      supabase
        .from('orders')
        .select(
          `id, order_number, user_id, status, total_amount, created_at,
           order_items ( id, order_id, product_id, price, products ( title, thumbnail_url ) )`
        )
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOrders((data as unknown as Order[]) || [])
          setLoadingOrders(false)
        })
    }
  }, [activeTab, member.id, orders.length, loadingOrders])

  useEffect(() => {
    if (activeTab === 'consulting' && consulting.length === 0 && !loadingConsulting) {
      setLoadingConsulting(true)
      const supabase = createClient()
      supabase
        .from('consulting_requests')
        .select('id, user_id, package_type, message, status, created_at')
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setConsulting((data as ConsultingRequest[]) || [])
          setLoadingConsulting(false)
        })
    }
  }, [activeTab, member.id, consulting.length, loadingConsulting])

  const tabs: { key: MemberModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: '회원정보', icon: <User className="w-3.5 h-3.5" /> },
    { key: 'orders', label: '주문내역', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: 'consulting', label: '문의내역', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[5vh] pb-[5vh]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {(member.name || '?')[0]}
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{member.name || '(이름 없음)'}</h2>
              <p className="text-xs text-gray-500">{member.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
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
              <div className="bg-gray-50 rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
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
                <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">주문 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-mono text-gray-500">{order.order_number}</span>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                        </div>
                      </div>
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700">{item.products?.title || '상품명 없음'}</span>
                          <span className="text-gray-500 font-medium">{formatWon(item.price)}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-end pt-2 border-t border-gray-200/60 mt-2">
                        <span className="text-sm font-semibold text-gray-900">합계 {formatWon(order.total_amount)}</span>
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
                <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>
              ) : consulting.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">문의 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consulting.map((req) => (
                    <div key={req.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{req.package_type}</Badge>
                        <span className="text-xs text-gray-400">{formatDate(req.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">{req.message}</p>
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
  const [memo, setMemo] = useState(order.admin_memo || '')
  const [memoSaving, setMemoSaving] = useState(false)
  const [memoSaved, setMemoSaved] = useState(false)
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

  const handleMemoSave = async () => {
    setMemoSaving(true)
    await onMemoSave(order.id, memo)
    setMemoSaving(false)
    setMemoSaved(true)
    setTimeout(() => setMemoSaved(false), 2000)
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

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[94vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">주문 상세</h2>
              <p className="text-xs text-gray-500 font-mono">{order.order_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 주문 기본정보 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">주문 기본정보</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">주문번호</p>
                  <p className="text-sm font-mono font-medium text-gray-900">{order.order_number}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">주문일시</p>
                  <p className="text-sm font-medium text-gray-900">{formatDateTime(order.created_at)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">결제상태</p>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          </div>

          {/* 주문 상품 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">주문 상품</h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {order.order_items?.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  {item.products?.thumbnail_url ? (
                    <img
                      src={item.products.thumbnail_url}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-gray-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.products?.title || '상품명 없음'}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 shrink-0">{formatWon(item.price)}</span>
                </div>
              ))}
              <div className="flex items-center justify-end pt-3 border-t border-gray-200/60">
                <span className="text-sm font-bold text-gray-900">합계 {formatWon(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* 결제 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">결제 정보</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">총 결제금액</p>
                  <p className="text-sm font-bold text-gray-900">{formatWon(order.total_amount)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">결제방법</p>
                  <p className="text-sm font-medium text-gray-900">
                    {PAYMENT_METHOD_LABEL[order.payment_method || ''] || order.payment_method || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">결제일시</p>
                  <p className="text-sm font-medium text-gray-900">{order.paid_at ? formatDateTime(order.paid_at) : '-'}</p>
                </div>
              </div>
              {order.refund_reason && (
                <div className="mt-3 pt-3 border-t border-gray-200/60">
                  <p className="text-[11px] text-gray-400 mb-1">환불 사유</p>
                  <p className="text-sm text-red-600">{order.refund_reason}</p>
                </div>
              )}
            </div>
          </div>

          {/* 다운로드 이력 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              다운로드 이력 ({orderDownloads.length}건)
            </h3>
            <div className="bg-gray-50 rounded-xl p-4">
              {orderDownloads.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">다운로드 기록이 없습니다</p>
              ) : (
                <div className="space-y-2">
                  {orderDownloads.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-gray-400" />
                        <span className="text-gray-700">{log.file_name}</span>
                      </div>
                      <span className="text-xs text-gray-400">{formatDateTime(log.downloaded_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 주문자 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">주문자 정보</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">이름</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">이메일</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.email || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">연락처</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.phone || '-'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 mb-1">회사</p>
                  <p className="text-sm font-medium text-gray-900">{profile?.company || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* 관리자 메모 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">관리자 메모</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="이 주문에 대한 메모를 남겨주세요..."
                rows={3}
                className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
              />
              <div className="flex items-center justify-end mt-2 gap-2">
                {memoSaved && <span className="text-xs text-green-600">저장됨</span>}
                <button
                  onClick={handleMemoSave}
                  disabled={memoSaving}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {memoSaving ? '저장 중...' : '메모 저장'}
                </button>
              </div>
            </div>
          </div>

          {/* 상태 변경 */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">상태 변경</h3>
            <div className="bg-gray-50 rounded-xl p-4 flex flex-wrap gap-2">
              {order.status === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction({ status: 'paid', label: '결제확인', color: 'bg-green-600 hover:bg-green-700' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    결제확인
                  </button>
                  <button
                    onClick={() => setConfirmAction({ status: 'cancelled', label: '취소', color: 'bg-gray-600 hover:bg-gray-700' })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-gray-500 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    주문 취소
                  </button>
                </>
              )}
              {order.status === 'paid' && (
                <button
                  onClick={() => setConfirmAction({ status: 'refunded', label: '환불', color: 'bg-red-600 hover:bg-red-700' })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  환불 처리
                </button>
              )}
              {(order.status === 'cancelled' || order.status === 'refunded') && (
                <p className="text-sm text-gray-400">변경 가능한 상태가 없습니다</p>
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
// Main Page
// ===========================

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [downloadLogs, setDownloadLogs] = useState<DownloadLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDropdownOpen, setBulkDropdownOpen] = useState(false)

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)

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

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()

    // Fetch orders + items (no FK join for profiles)
    const ordersResult = await supabase
      .from('orders')
      .select(
        `id, order_number, user_id, status, total_amount, payment_method, payment_key, paid_at, cancelled_at, refund_reason, admin_memo, created_at, updated_at,
         order_items ( id, order_id, product_id, price, products ( title, thumbnail_url ) )`
      )
      .order('created_at', { ascending: false })

    const orderList = (ordersResult.data as unknown as Order[]) || []

    // Fetch profiles separately by user_ids
    const userIds = [...new Set(orderList.map(o => o.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, name, phone, company, role, created_at')
        .in('id', userIds)
      if (profilesData) {
        const profileMap = new Map(profilesData.map(p => [p.id, p]))
        orderList.forEach(o => {
          (o as any).profiles = profileMap.get(o.user_id) || null
        })
      }
    }

    const logsResult = await supabase
      .from('download_logs')
      .select('*')
      .order('downloaded_at', { ascending: false })

    setOrders(orderList)
    setDownloadLogs((logsResult.data as DownloadLogEntry[]) || [])
    setLoading(false)
  }

  // Status change handler
  const handleStatusChange = useCallback(async (orderId: number, status: string) => {
    const supabase = createClient()
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'paid') updates.paid_at = new Date().toISOString()
    if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()

    await supabase.from('orders').update(updates).eq('id', orderId)

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, ...updates } as Order : o))
    )
    // Refresh the selected order if it's the one we changed
    setSelectedOrder((prev) => (prev && prev.id === orderId ? { ...prev, ...updates } as Order : prev))
    setToast('주문 상태가 변경되었습니다')
  }, [])

  // Memo save handler
  const handleMemoSave = useCallback(async (orderId: number, memo: string) => {
    const supabase = createClient()
    await supabase.from('orders').update({ admin_memo: memo, updated_at: new Date().toISOString() }).eq('id', orderId)
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, admin_memo: memo } : o))
    )
  }, [])

  // Bulk status change
  const handleBulkStatusChange = useCallback(async (status: string) => {
    if (selectedIds.size === 0) return
    const supabase = createClient()
    const updates: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'paid') updates.paid_at = new Date().toISOString()
    if (status === 'cancelled') updates.cancelled_at = new Date().toISOString()

    const ids = Array.from(selectedIds)
    await supabase.from('orders').update(updates).in('id', ids)

    setOrders((prev) =>
      prev.map((o) => (selectedIds.has(o.id) ? { ...o, ...updates } as Order : o))
    )
    setSelectedIds(new Set())
    setBulkDropdownOpen(false)
    setToast(`${ids.length}건의 주문 상태가 변경되었습니다`)
  }, [selectedIds])

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

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (o) =>
          o.order_number.toLowerCase().includes(q) ||
          (o.profiles?.name || '').toLowerCase().includes(q) ||
          (o.profiles?.email || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [orders, statusFilter, search, dateFrom, dateTo])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length, pending: 0, paid: 0, cancelled: 0, refunded: 0 }
    for (const o of orders) {
      if (counts[o.status] !== undefined) counts[o.status]++
    }
    return counts
  }, [orders])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter, pageSize, dateFrom, dateTo])

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">주문 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            전체 {orders.length}건의 주문을 관리합니다
          </p>
        </div>

        {/* Status Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 p-1 mb-4 inline-flex gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                statusFilter === tab.key
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
              <span
                className={`ml-1.5 text-xs ${
                  statusFilter === tab.key ? 'text-gray-300' : 'text-gray-400'
                }`}
              >
                {statusCounts[tab.key] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              {/* Search */}
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="주문번호, 주문자 이름, 이메일"
                  className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('')
                      searchRef.current?.focus()
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500"
                />
                <span className="text-gray-400 text-sm">~</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value={20}>20개</option>
              <option value={50}>50개</option>
              <option value={100}>100개</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-700">선택 {selectedIds.size}건</span>
            <div className="flex items-center gap-2">
              {/* Bulk status change */}
              <div className="relative" ref={bulkRef}>
                <button
                  onClick={() => setBulkDropdownOpen(!bulkDropdownOpen)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  상태 일괄 변경
                  <ChevronDown className="w-3 h-3" />
                </button>
                {bulkDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[120px]">
                    {(['paid', 'cancelled', 'refunded'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleBulkStatusChange(s)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-white border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                엑셀 다운로드
              </button>

              {/* Clear selection */}
              <button
                onClick={() => setSelectedIds(new Set())}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <Download className="w-3 h-3" />
              엑셀 다운로드
            </button>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문정보
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    품목 / 가격
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결제 정보
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    다운로드
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">주문 목록을 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">
                        {search || dateFrom || dateTo ? '검색 결과가 없습니다' : '주문 내역이 없습니다'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((order) => {
                    const profile = order.profiles
                    const dlCount = getOrderDownloadCount(order)
                    return (
                      <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                        {/* Checkbox */}
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={() => toggleOne(order.id)}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                          />
                        </td>

                        {/* 주문정보 */}
                        <td className="px-4 py-4 align-top min-w-[220px]">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="text-sm font-mono text-blue-600 hover:text-blue-800 hover:underline mb-1 cursor-pointer text-left"
                          >
                            {order.order_number}
                          </button>
                          <p className="text-xs text-gray-400 mb-2">{formatDateTime(order.created_at)}</p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (profile) setSelectedMember(profile)
                              }}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                            >
                              {profile?.name || '-'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400">{profile?.email || '-'}</p>
                          <p className="text-xs text-gray-400">{profile?.phone || '-'}</p>
                        </td>

                        {/* 품목 / 가격 */}
                        <td className="px-4 py-4 align-top min-w-[240px]">
                          <div className="space-y-2">
                            {order.order_items?.map((item) => (
                              <div key={item.id} className="flex items-center gap-2">
                                {item.products?.thumbnail_url ? (
                                  <img
                                    src={item.products.thumbnail_url}
                                    alt=""
                                    className="w-8 h-8 rounded object-cover bg-gray-100 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                    <Package className="w-3.5 h-3.5 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm text-gray-700 truncate max-w-[180px]">{item.products?.title || '상품명 없음'}</p>
                                  <p className="text-xs text-gray-400">{formatWon(item.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 결제 정보 */}
                        <td className="px-4 py-4 align-top min-w-[160px]">
                          <p className="text-sm font-semibold text-gray-900 mb-1">{formatWon(order.total_amount)}</p>
                          <p className="text-xs text-gray-400 mb-2">
                            {PAYMENT_METHOD_LABEL[order.payment_method || ''] || order.payment_method || '-'}
                          </p>
                          <StatusBadge status={order.status} />
                        </td>

                        {/* 다운로드 */}
                        <td className="px-4 py-4 align-top text-center">
                          <span className={`text-sm font-medium ${dlCount > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                            {dlCount}회
                          </span>
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                총 {filtered.length}건 중 {(safePage - 1) * pageSize + 1}-
                {Math.min(safePage * pageSize, filtered.length)}건
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
                      <span key={`e-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                          safePage === item
                            ? 'bg-gray-900 text-white'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
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

      {/* Toast */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
