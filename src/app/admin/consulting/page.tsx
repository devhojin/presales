'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { Badge } from '@/components/ui/badge'
import {
  Search,
  X,
  User,
  Mail,
  Phone,
  Building,
  MessageSquare,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'

// ===========================
// Types
// ===========================

interface ConsultingRequest {
  id: number
  user_id: string | null
  name: string
  email: string
  phone: string | null
  company: string | null
  package_type: string
  message: string | null
  status: string
  created_at: string
  updated_at: string | null
}

// ===========================
// Constants
// ===========================

const packageLabels: Record<string, string> = {
  spot: '스팟상담',
  review: '제안서리뷰',
  project: '프로젝트컨설팅',
}

const statusConfig: Record<string, { label: string; class: string; bg: string }> = {
  pending: {
    label: '대기',
    class: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
    bg: 'bg-yellow-500',
  },
  confirmed: {
    label: '진행중',
    class: 'bg-primary/8 text-primary border border-primary/20',
    bg: 'bg-primary',
  },
  completed: {
    label: '완료',
    class: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    bg: 'bg-emerald-500',
  },
  cancelled: {
    label: '취소',
    class: 'bg-muted text-muted-foreground border border-border',
    bg: 'bg-gray-400',
  },
}

type FilterTab = 'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'

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

// ===========================
// Sub-components
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
// Status Confirm Modal
// ===========================

function StatusConfirmModal({
  request,
  targetStatus,
  onConfirm,
  onCancel,
  loading,
}: {
  request: ConsultingRequest
  targetStatus: string
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  const targetLabel = statusConfig[targetStatus]?.label || targetStatus

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
          <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">상태 변경 확인</h3>
            <p className="text-xs text-muted-foreground">이 작업은 즉시 적용됩니다</p>
          </div>
        </div>
        <p className="text-sm text-foreground mb-6">
          <span className="font-medium">{request.name}</span> 님의 상담 상태를{' '}
          <span className="font-semibold text-primary">{targetLabel}</span>(으)로 변경하시겠습니까?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? '처리 중...' : '변경'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Detail Modal
// ===========================

interface MemberStats {
  joined_at: string
  total_orders: number
  paid_orders: number
  total_spent: number
  past_consulting: number
}

function ConsultingDetailModal({
  request,
  onClose,
  onStatusChange,
}: {
  request: ConsultingRequest
  onClose: () => void
  onStatusChange: (id: number, status: string) => Promise<void>
}) {
  const [showConfirm, setShowConfirm] = useState(false)
  const [targetStatus, setTargetStatus] = useState('')
  const [confirmLoading, setConfirmLoading] = useState(false)
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  // 회원 통계 로드 (등록 회원만)
  useEffect(() => {
    if (!request.user_id) return
    let cancelled = false
    async function loadStats() {
      setStatsLoading(true)
      try {
        const supabase = createClient()
        const [profileRes, ordersRes, consultingRes] = await Promise.all([
          supabase.from('profiles').select('created_at').eq('id', request.user_id!).maybeSingle(),
          supabase.from('orders').select('id, status, total_amount').eq('user_id', request.user_id!),
          supabase.from('consulting_requests').select('id', { count: 'exact', head: true }).eq('user_id', request.user_id!).neq('id', request.id),
        ])
        if (cancelled) return
        const orders = ordersRes.data || []
        const paidOrders = orders.filter(o => o.status === 'paid' || o.status === 'completed')
        setMemberStats({
          joined_at: profileRes.data?.created_at || request.created_at,
          total_orders: orders.length,
          paid_orders: paidOrders.length,
          total_spent: paidOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0),
          past_consulting: consultingRes.count || 0,
        })
      } catch (err) {
        console.error('Failed to load member stats:', err)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    loadStats()
    return () => { cancelled = true }
  }, [request.user_id, request.id, request.created_at])

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showConfirm) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = ''
    }
  }, [onClose, showConfirm])

  const handleStatusClick = (status: string) => {
    setTargetStatus(status)
    setShowConfirm(true)
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await onStatusChange(request.id, targetStatus)
    } finally {
      setConfirmLoading(false)
      setShowConfirm(false)
    }
  }

  const cfg = statusConfig[request.status]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] pb-[5vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm">
              {(request.name || '?')[0]}
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">{request.name}</h2>
              <p className="text-xs text-muted-foreground">{request.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 신청자 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              신청자 정보
              {request.user_id ? (
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">등록 회원</Badge>
              ) : (
                <Badge className="bg-muted text-muted-foreground border border-border text-[10px]">비회원</Badge>
              )}
            </h3>
            <div className="bg-muted rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
              <InfoRow icon={<User className="w-4 h-4" />} label="이름" value={request.name || '-'} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="이메일" value={request.email} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="연락처" value={request.phone || '-'} />
              <InfoRow icon={<Building className="w-4 h-4" />} label="회사" value={request.company || '-'} />
            </div>
          </div>

          {/* 회원 통계 (등록 회원만) */}
          {request.user_id && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                회원 활동 이력
              </h3>
              <div className="bg-muted rounded-xl p-4">
                {statsLoading ? (
                  <p className="text-sm text-muted-foreground text-center py-2">불러오는 중...</p>
                ) : memberStats ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">가입일</p>
                      <p className="font-medium mt-0.5">{formatDateTime(memberStats.joined_at)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">총 주문</p>
                      <p className="font-medium mt-0.5">{memberStats.total_orders}건 (결제완료 {memberStats.paid_orders}건)</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">누적 결제금액</p>
                      <p className="font-semibold mt-0.5 text-primary">{memberStats.total_spent.toLocaleString()}원</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase">이전 컨설팅 신청</p>
                      <p className="font-medium mt-0.5">{memberStats.past_consulting}건</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">회원 정보를 불러올 수 없습니다</p>
                )}
              </div>
            </div>
          )}

          {/* 패키지 유형 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              패키지 유형
            </h3>
            <div className="bg-muted rounded-xl p-4">
              <Badge className="bg-primary/8 text-primary border border-primary/20 text-sm px-3 py-1">
                {packageLabels[request.package_type] || request.package_type}
              </Badge>
            </div>
          </div>

          {/* 상담 메시지 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              상담 메시지
            </h3>
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {request.message || '(메시지 없음)'}
                </p>
              </div>
            </div>
          </div>

          {/* 상태 관리 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              상태 관리
            </h3>
            <div className="bg-muted rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">현재 상태</p>
                    <Badge className={`${cfg?.class || 'bg-muted text-muted-foreground border border-border'} mt-1`}>
                      {cfg?.label || request.status}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.status !== 'pending' && (
                  <button
                    onClick={() => handleStatusClick('pending')}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                  >
                    <Clock className="w-4 h-4" />
                    대기
                  </button>
                )}
                {request.status !== 'confirmed' && request.status !== 'completed' && (
                  <button
                    onClick={() => handleStatusClick('confirmed')}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    진행중
                  </button>
                )}
                {request.status === 'confirmed' && (
                  <button
                    onClick={() => handleStatusClick('completed')}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료
                  </button>
                )}
                {request.status !== 'cancelled' && (
                  <button
                    onClick={() => handleStatusClick('cancelled')}
                    className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-gray-300 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    취소
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 일시 정보 */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              일시 정보
            </h3>
            <div className="bg-muted rounded-xl p-4 space-y-0 divide-y divide-gray-200/60">
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="신청일"
                value={formatDateTime(request.created_at)}
              />
              {request.updated_at && (
                <InfoRow
                  icon={<Clock className="w-4 h-4" />}
                  label="상태변경일"
                  value={formatDateTime(request.updated_at)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Confirm Modal */}
      {showConfirm && (
        <StatusConfirmModal
          request={request}
          targetStatus={targetStatus}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
          loading={confirmLoading}
        />
      )}
    </div>
  )
}

// ===========================
// Main Page
// ===========================

export default function AdminConsulting() {
  const [requests, setRequests] = useState<ConsultingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedRequest, setSelectedRequest] = useState<ConsultingRequest | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  async function loadRequests() {
    const supabase = createClient()
    const { data } = await supabase
      .from('consulting_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10000)
    setRequests(data || [])
    setLoading(false)
  }

  const handleStatusChange = useCallback(async (id: number, status: string) => {
    const supabase = createClient()
    const now = new Date().toISOString()
    await supabase
      .from('consulting_requests')
      .update({ status, updated_at: now })
      .eq('id', id)
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status, updated_at: now } : r))
    )
    setSelectedRequest((prev) =>
      prev && prev.id === id ? { ...prev, status, updated_at: now } : prev
    )
  }, [])

  // Filter + Search
  const filtered = useMemo(() => {
    let result = requests

    // Status filter
    if (filterTab !== 'all') {
      result = result.filter((r) => r.status === filterTab)
    }

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (r) =>
          (r.name || '').toLowerCase().includes(q) ||
          (r.email || '').toLowerCase().includes(q) ||
          (r.company || '').toLowerCase().includes(q)
      )
    }

    return result
  }, [requests, filterTab, search])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(currentPage, totalPages)
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [search, filterTab, pageSize])

  // Stats
  const totalCount = requests.length
  const pendingCount = requests.filter((r) => r.status === 'pending').length
  const confirmedCount = requests.filter((r) => r.status === 'confirmed').length
  const completedCount = requests.filter((r) => r.status === 'completed').length
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: '전체', count: totalCount },
    { key: 'pending', label: '대기', count: pendingCount },
    { key: 'confirmed', label: '진행중', count: confirmedCount },
    { key: 'completed', label: '완료', count: completedCount },
    { key: 'cancelled', label: '취소', count: cancelledCount },
  ]

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">컨설팅 신청 관리</h1>
          <p className="text-sm text-muted-foreground mt-1">
            전체 {totalCount}건의 컨설팅 신청을 관리합니다
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-xl border border-border p-4 mb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted rounded-full p-1">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterTab(tab.key)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterTab === tab.key
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 text-xs ${
                      filterTab === tab.key ? 'text-muted-foreground' : 'text-muted-foreground'
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
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="이름, 이메일, 회사 검색"
                  className="w-full sm:w-64 pl-9 pr-8 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('')
                      searchRef.current?.focus()
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="border border-border rounded-xl px-3 py-2 text-sm text-foreground bg-white focus:outline-none focus:border-primary"
              >
                <option value={20}>20개</option>
                <option value={50}>50개</option>
                <option value={100}>100개</option>
              </select>
            </div>
          </div>
        </div>

        {/* Consulting Table */}
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    신청자
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                    이메일
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden xl:table-cell">
                    연락처
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                    회사
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    패키지
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    상태
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                    신청일
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-2 border-border border-t-blue-600 rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">신청 목록을 불러오는 중...</p>
                      </div>
                    </td>
                  </tr>
                ) : paged.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-16 text-center">
                      <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {search ? '검색 결과가 없습니다' : '컨설팅 신청이 없습니다'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paged.map((req) => {
                    const cfg = statusConfig[req.status]
                    const pkgLabel = packageLabels[req.package_type] || req.package_type
                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="hover:bg-primary/8/40 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-muted-foreground text-xs font-semibold flex-shrink-0">
                              {(req.name || '?')[0]}
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {req.name || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm hidden lg:table-cell">
                          <a href={`mailto:${req.email}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                            {req.email}
                          </a>
                        </td>
                        <td className="px-6 py-4 text-sm hidden xl:table-cell">
                          {req.phone ? (
                            <a href={`tel:${req.phone}`} className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                              {req.phone}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden md:table-cell">
                          {req.company || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-primary/8 text-primary border border-primary/20">
                            {pkgLabel}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={cfg?.class || 'bg-muted text-muted-foreground border border-border'}>
                            {cfg?.label || req.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                          {formatDate(req.created_at)}
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
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
                        className={`w-8 h-8 flex items-center justify-center rounded-xl text-sm font-medium transition-colors ${
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
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <ConsultingDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  )
}
