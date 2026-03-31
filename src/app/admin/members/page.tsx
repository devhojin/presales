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

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  price: number
  products: { title: string } | null
}

interface Order {
  id: string
  order_number: string
  user_id: string
  status: string
  total_amount: number
  created_at: string
  order_items: OrderItem[]
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
// Sub-components
// ===========================

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-50 text-green-700 border border-green-200',
    paid: 'bg-blue-50 text-blue-700 border border-blue-200',
    pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    cancelled: 'bg-red-50 text-red-700 border border-red-200',
    answered: 'bg-green-50 text-green-700 border border-green-200',
    구매확정: 'bg-green-50 text-green-700 border border-green-200',
    결제완료: 'bg-blue-50 text-blue-700 border border-blue-200',
    결제대기: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    취소: 'bg-red-50 text-red-700 border border-red-200',
    답변완료: 'bg-green-50 text-green-700 border border-green-200',
    대기중: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  }
  const label: Record<string, string> = {
    completed: '완료',
    paid: '결제완료',
    pending: '대기중',
    cancelled: '취소',
    answered: '답변완료',
  }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${styles[status] || 'bg-gray-50 text-gray-600 border border-gray-200'}`}
    >
      {label[status] || status}
    </span>
  )
}

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
// Role Toggle Confirm Modal
// ===========================

function RoleConfirmModal({
  memberName,
  currentRole,
  onConfirm,
  onCancel,
  loading,
}: {
  memberName: string
  currentRole: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const newRoleLabel = currentRole === 'admin' ? '일반' : '관리자'

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">권한 변경 확인</h3>
            <p className="text-xs text-gray-500">이 작업은 즉시 적용됩니다</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-6">
          <span className="font-medium">{memberName}</span> 님의 권한을{' '}
          <span className="font-semibold text-blue-600">{newRoleLabel}</span>(으)로 변경하시겠습니까?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Member Detail Modal
// ===========================

type ModalTab = 'info' | 'orders' | 'consulting'

function MemberDetailModal({
  member,
  onClose,
  onRoleChange,
}: {
  member: Profile
  onClose: () => void
  onRoleChange: (id: string, newRole: string) => Promise<void>
}) {
  const [activeTab, setActiveTab] = useState<ModalTab>('info')
  const [orders, setOrders] = useState<Order[]>([])
  const [consulting, setConsulting] = useState<ConsultingRequest[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [loadingConsulting, setLoadingConsulting] = useState(false)
  const [showRoleConfirm, setShowRoleConfirm] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const [currentRole, setCurrentRole] = useState(member.role)
  const [adminMemo, setAdminMemo] = useState('')

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showRoleConfirm) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose, showRoleConfirm])

  // Load orders when tab is activated
  useEffect(() => {
    if (activeTab === 'orders' && orders.length === 0 && !loadingOrders) {
      setLoadingOrders(true)
      const supabase = createClient()
      supabase
        .from('orders')
        .select(
          `id, order_number, user_id, status, total_amount, created_at,
           order_items ( id, order_id, product_id, price, products ( title ) )`
        )
        .eq('user_id', member.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          setOrders((data as unknown as Order[]) || [])
          setLoadingOrders(false)
        })
    }
  }, [activeTab, member.id, orders.length, loadingOrders])

  // Load consulting when tab is activated
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

  const handleRoleToggle = async () => {
    setRoleLoading(true)
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await onRoleChange(member.id, newRole)
      setCurrentRole(newRole)
    } finally {
      setRoleLoading(false)
      setShowRoleConfirm(false)
    }
  }

  const tabs: { key: ModalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: '기본정보', icon: <User className="w-3.5 h-3.5" /> },
    { key: 'orders', label: '구매내역', icon: <ShoppingCart className="w-3.5 h-3.5" /> },
    { key: 'consulting', label: '상담내역', icon: <MessageSquare className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-[5vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
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
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
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
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
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
          {/* 기본정보 탭 */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              {/* 회원 기본정보 */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  회원 기본정보
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
                  <InfoRow icon={<User className="w-4 h-4" />} label="이름" value={member.name || '-'} />
                  <InfoRow icon={<Mail className="w-4 h-4" />} label="이메일" value={member.email} />
                  <InfoRow icon={<Phone className="w-4 h-4" />} label="연락처" value={member.phone || '-'} />
                  <InfoRow icon={<Building className="w-4 h-4" />} label="회사" value={member.company || '-'} />
                  <InfoRow
                    icon={<Calendar className="w-4 h-4" />}
                    label="가입일"
                    value={formatDateTime(member.created_at)}
                  />
                </div>
              </div>

              {/* 권한 변경 */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  권한 관리
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">현재 권한</p>
                      <Badge
                        className={
                          currentRole === 'admin'
                            ? 'bg-red-50 text-red-700 border border-red-200 mt-1'
                            : 'bg-gray-100 text-gray-600 border border-gray-200 mt-1'
                        }
                      >
                        {currentRole === 'admin' ? '관리자' : '일반'}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowRoleConfirm(true)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors ${
                      currentRole === 'admin'
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {currentRole === 'admin' ? '일반으로 변경' : '관리자로 변경'}
                  </button>
                </div>
              </div>

              {/* 관리자 메모 */}
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  관리자 메모
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <StickyNote className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <textarea
                      value={adminMemo}
                      onChange={(e) => setAdminMemo(e.target.value)}
                      placeholder="이 회원에 대한 메모를 남겨주세요..."
                      rows={3}
                      className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 구매내역 탭 */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                구매 내역
              </h3>
              {loadingOrders ? (
                <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>
              ) : orders.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">구매 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-xs font-mono text-gray-500">
                            {order.order_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={order.status} />
                          <span className="text-xs text-gray-400">
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                      {order.order_items && order.order_items.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {order.order_items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-gray-700">
                                {item.products?.title || '상품명 없음'}
                              </span>
                              <span className="text-gray-500 font-medium">
                                {formatWon(item.price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-end pt-2 border-t border-gray-200/60">
                        <span className="text-sm font-semibold text-gray-900">
                          합계 {formatWon(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 상담내역 탭 */}
          {activeTab === 'consulting' && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                상담 내역
              </h3>
              {loadingConsulting ? (
                <div className="text-center py-12 text-sm text-gray-400">불러오는 중...</div>
              ) : consulting.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">상담 내역이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consulting.map((req) => (
                    <div
                      key={req.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className="bg-blue-50 text-blue-700 border border-blue-200">
                          {req.package_type}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={req.status} />
                          <span className="text-xs text-gray-400">
                            {formatDate(req.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3">
                        {req.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Role Confirm Modal */}
      {showRoleConfirm && (
        <RoleConfirmModal
          memberName={member.name || '(이름 없음)'}
          currentRole={currentRole}
          onConfirm={handleRoleToggle}
          onCancel={() => setShowRoleConfirm(false)}
          loading={roleLoading}
        />
      )}
    </div>
  )
}

// ===========================
// Main Page
// ===========================

type FilterTab = 'all' | 'user' | 'admin'

export default function AdminMembers() {
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  async function handleRoleChange(id: string, newRole: string) {
    const supabase = createClient()
    await supabase.from('profiles').update({ role: newRole }).eq('id', id)
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, role: newRole } : m))
    )
  }

  // Filter + Search
  const filtered = useMemo(() => {
    let result = members

    // Role filter
    if (filterTab === 'user') result = result.filter((m) => m.role !== 'admin')
    if (filterTab === 'admin') result = result.filter((m) => m.role === 'admin')

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (m) =>
          (m.name || '').toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.company || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [members, filterTab, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterTab, pageSize])

  // Stats
  const totalCount = members.length
  const adminCount = members.filter((m) => m.role === 'admin').length
  const userCount = totalCount - adminCount

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: totalCount },
    { key: 'user', label: '일반', count: userCount },
    { key: 'admin', label: '관리자', count: adminCount },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">회원 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            전체 {totalCount}명의 회원을 관리합니다
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-full p-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterTab === tab.key
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs ${
                      filterTab === tab.key ? 'text-gray-300' : 'text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + Page Size */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이름, 이메일, 회사 검색"
                  className="w-full sm:w-64 pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('')
                      searchRef.current?.focus()
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>
        </div>

        {/* Members Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이름
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    연락처
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    회사
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    가입일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm text-gray-400">회원 목록을 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-gray-400">
                        {search ? '검색 결과가 없습니다' : '가입된 회원이 없습니다'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedMember(m)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 text-xs font-semibold flex-shrink-0">
                            {(m.name || '?')[0]}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {m.name || '-'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{m.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                        {m.phone || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
                        {m.company || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            m.role === 'admin'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-gray-50 text-gray-500 border border-gray-200'
                          }
                        >
                          {m.role === 'admin' ? '관리자' : '일반'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 hidden sm:table-cell">
                        {formatDate(m.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && filtered.length > 0 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                총 {filtered.length}명 중 {(safePage - 1) * pageSize + 1}-
                {Math.min(safePage * pageSize, filtered.length)}명
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    // Show first, last, and pages around current
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
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
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
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Member Detail Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          onRoleChange={handleRoleChange}
        />
      )}
    </div>
  )
}
