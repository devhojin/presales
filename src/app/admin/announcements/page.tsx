'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import {
  Plus, Search, Megaphone, Calendar, Building2, ExternalLink, Eye, EyeOff,
  Trash2, X, Loader2, RefreshCw, Clock, LogOut, AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// ===========================
// Types & Constants
// ===========================

interface Announcement {
  id: string
  title: string
  organization: string
  type: 'government' | 'private' | 'poc'
  budget: string
  start_date: string
  end_date: string
  application_method: string
  target: string
  description: string
  eligibility: string
  department: string
  contact: string
  source_url: string
  is_published: boolean
  status: 'active' | 'closed'
  created_at: string
  updated_at: string
}

type Tab = 'all' | 'published' | 'unpublished' | 'closed'

const TYPE_LABELS: Record<string, string> = {
  government: '정부지원',
  private: '민간',
  poc: 'PoC',
}

const TYPE_COLORS: Record<string, string> = {
  government: 'bg-primary/10 text-primary',
  private: 'bg-blue-100 text-blue-700',
  poc: 'bg-purple-100 text-purple-700',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-primary/10 text-primary',
  closed: 'bg-muted text-muted-foreground',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

function formatPeriod(startDate: string | null, endDate: string | null): string {
  const start = formatDate(startDate)
  const end = formatDate(endDate)
  return `${start} ~ ${end}`
}

function isExpired(endDate: string | null): boolean {
  if (!endDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(endDate) < today
}

// ===========================
// Confirm Modal
// ===========================

function ConfirmModal({
  type,
  count,
  onConfirm,
  onCancel,
}: {
  type: 'delete' | 'permanent-delete' | 'publish' | null
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    if (!type) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [type, onCancel])

  if (!type) return null

  const isPermanent = type === 'permanent-delete'
  const isPublish = type === 'publish'

  const iconBg = isPermanent ? 'bg-red-100' : isPublish ? 'bg-primary/10' : 'bg-orange-100'
  const titleText = isPermanent ? '완전삭제 확인' : isPublish ? '공개 확인' : '삭제 확인'
  const btnColor = isPermanent ? 'bg-red-600 hover:bg-red-700' : isPublish ? 'bg-primary hover:bg-primary/90' : 'bg-orange-500 hover:bg-orange-600'
  const btnText = isPermanent ? '완전삭제' : isPublish ? '공개' : '삭제'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
            {isPermanent && <Trash2 className="w-5 h-5 text-red-600" />}
            {isPublish && <Eye className="w-5 h-5 text-primary" />}
            {!isPermanent && !isPublish && <Trash2 className="w-5 h-5 text-orange-600" />}
          </div>
          <h3 className="text-lg font-bold text-foreground">{titleText}</h3>
        </div>

        <div className="text-sm text-muted-foreground space-y-2 mb-6">
          {isPermanent ? (
            <>
              <p>선택한 <strong className="text-foreground">{count}건</strong>의 공고를 완전삭제하시겠습니까?</p>
              <p className="text-red-600 font-medium">완전삭제된 공고는 복구할 수 없습니다.</p>
            </>
          ) : isPublish ? (
            <>
              <p>선택한 <strong className="text-foreground">{count}건</strong>의 공고를 공개하시겠습니까?</p>
              <p>공개된 공고는 사용자에게 표시됩니다.</p>
            </>
          ) : (
            <>
              <p>선택한 <strong className="text-foreground">{count}건</strong>의 공고를 삭제하시겠습니까?</p>
              <p>삭제된 공고는 언제든 복구할 수 있습니다.</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-xl transition-colors ${btnColor}`}
          >
            {btnText}
          </button>
        </div>
      </div>
    </div>
  )
}

// ===========================
// Toast
// ===========================

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed bottom-6 right-6 z-[70]">
      <div className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm">
        {message}
        <button onClick={onClose} className="text-gray-300 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

// ===========================
// Main Page
// ===========================

export default function AnnouncementsPage() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [tab, setTab] = useState<Tab>('all')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [modalType, setModalType] = useState<'delete' | 'permanent-delete' | 'publish' | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [totalCount, setTotalCount] = useState(0)
  const [tabCounts, setTabCounts] = useState<Record<Tab, number>>({ all: 0, published: 0, unpublished: 0, closed: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [fetchingNow, setFetchingNow] = useState(false)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
  }, [])

  // Search debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setCurrentPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const supabase = createClient()
      let query = supabase.from('announcements').select('*', { count: 'exact' })

      // Tab filter
      if (tab === 'published') {
        query = query.eq('is_published', true)
      } else if (tab === 'unpublished') {
        query = query.eq('is_published', false)
      } else if (tab === 'closed') {
        query = query.eq('status', 'closed')
      }

      // Search filter
      if (debouncedSearch.trim()) {
        query = query.or(`title.ilike.%${debouncedSearch}%,organization.ilike.%${debouncedSearch}%`)
      }

      const offset = (currentPage - 1) * pageSize
      const { data, error: queryError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (queryError) throw new Error(queryError.message)

      setAnnouncements(data || [])
      setTotalCount(count || 0)

      // Fetch tab counts
      const [allRes, pubRes, unpubRes, closedRes] = await Promise.all([
        supabase.from('announcements').select('id', { count: 'exact' }),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('is_published', true),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('is_published', false),
        supabase.from('announcements').select('id', { count: 'exact' }).eq('status', 'closed'),
      ])

      setTabCounts({
        all: allRes.count || 0,
        published: pubRes.count || 0,
        unpublished: unpubRes.count || 0,
        closed: closedRes.count || 0,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [currentPage, pageSize, tab, debouncedSearch])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  const handleFetchNow = async () => {
    setFetchingNow(true)
    try {
      const res = await fetch('/api/admin/announcements/trigger-fetch', { method: 'POST' })
      if (!res.ok) throw new Error('수집 실패')
      showToast('공고를 수집하고 있습니다')
      setTimeout(() => fetchAnnouncements(), 2000)
    } catch (e) {
      showToast(e instanceof Error ? e.message : '수집 중 오류가 발생했습니다')
    } finally {
      setFetchingNow(false)
    }
  }

  const handleTogglePublish = async (id: string, publish: boolean) => {
    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_published: publish }),
      })
      if (!res.ok) throw new Error('수정 실패')
      showToast(`공고를 ${publish ? '공개' : '비공개'}했습니다`)
      await fetchAnnouncements()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '수정 중 오류가 발생했습니다')
    }
  }

  const handleBulkPublish = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/admin/announcements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, is_published: true }),
      })
      if (!res.ok) throw new Error('공개 실패')
      showToast(`${ids.length}건 공개 완료`)
      setSelectedIds(new Set())
      await fetchAnnouncements()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '공개 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
      setModalType(null)
    }
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, permanent: false }),
      })
      if (!res.ok) throw new Error('삭제 실패')
      showToast(`${ids.length}건 삭제됨`)
      setSelectedIds(new Set())
      await fetchAnnouncements()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
      setModalType(null)
    }
  }

  const handlePermanentDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const res = await fetch('/api/admin/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, permanent: true }),
      })
      if (!res.ok) throw new Error('완전삭제 실패')
      showToast(`${ids.length}건 완전삭제됨`)
      setSelectedIds(new Set())
      await fetchAnnouncements()
    } catch (e) {
      showToast(e instanceof Error ? e.message : '완전삭제 중 오류가 발생했습니다')
    } finally {
      setDeleting(false)
      setModalType(null)
    }
  }

  const PAGE_SIZES = [20, 50, 100] as const
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const safePage = Math.min(currentPage, totalPages)

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedIds(next)
  }

  const togglePageSelectAll = () => {
    if (announcements.every(a => selectedIds.has(a.id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(announcements.map(a => a.id)))
    }
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'published', label: '공개' },
    { key: 'unpublished', label: '비공개' },
    { key: 'closed', label: '마감' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">공고 관리</h1>
            <p className="text-sm text-muted-foreground">정부 공고를 관리합니다</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleFetchNow}
            disabled={fetchingNow}
            className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-primary bg-primary/10 border border-primary/20 rounded-xl hover:bg-primary/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${fetchingNow ? 'animate-spin' : ''}`} />
            {fetchingNow ? '수집 중...' : '지금 불러오기'}
          </button>
          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            공고 등록
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border/50">
        <div className="flex gap-1 -mb-px">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key)
                setCurrentPage(1)
                setSelectedIds(new Set())
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                tab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                tab === t.key ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
              }`}>
                {tabCounts[t.key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="공고명 또는 기관명으로 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground mr-1">보기</span>
            {PAGE_SIZES.map(s => (
              <button
                key={s}
                onClick={() => {
                  setPageSize(s)
                  setCurrentPage(1)
                }}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                  pageSize === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s}개
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">{selectedIds.size}건 선택</span>
            <button
              onClick={() => setModalType('publish')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
            >
              <Eye className="w-4 h-4" />
              선택 공개
            </button>
            <button
              onClick={() => setModalType('delete')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              선택 삭제
            </button>
            <button
              onClick={() => setModalType('permanent-delete')}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              완전삭제
            </button>
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
        </div>
      )}

      {error && !loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <AlertCircle className="w-8 h-8 text-red-400" />
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={fetchAnnouncements}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 text-sm text-foreground hover:bg-muted transition"
          >
            <RefreshCw className="w-4 h-4" />
            재시도
          </button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={announcements.length > 0 && announcements.every(a => selectedIds.has(a.id))}
                      onChange={togglePageSelectAll}
                      className="w-4 h-4 rounded border-border/50 text-primary cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">공고명</th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground w-32">기관명</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-20">유형</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-32">접수기간</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-20">상태</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground w-20">공개</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {announcements.map((item) => {
                  const expired = isExpired(item.end_date)
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/30 transition-colors ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-4 h-4 rounded border-border/50 text-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/admin/announcements/${item.id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block"
                        >
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-muted-foreground truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-sm">{item.organization}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className={`text-xs font-semibold ${TYPE_COLORS[item.type]}`}>
                          {TYPE_LABELS[item.type]}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          {formatPeriod(item.start_date, item.end_date)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Badge variant="secondary" className={`text-xs font-semibold ${STATUS_COLORS[item.status]}`}>
                          {item.status === 'active' ? '모집중' : '마감'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {expired ? (
                          <Badge variant="secondary" className="text-xs font-semibold">마감</Badge>
                        ) : (
                          <button
                            onClick={() => handleTogglePublish(item.id, !item.is_published)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              item.is_published
                                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                : 'bg-red-100/50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {item.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {item.is_published ? '공개' : '비공개'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
                {announcements.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                      등록된 공고가 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-border/50">
            {announcements.map((item) => {
              const expired = isExpired(item.end_date)
              return (
                <div key={item.id} className={`p-4 space-y-3 ${selectedIds.has(item.id) ? 'bg-primary/5' : ''}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 rounded border-border/50 text-primary cursor-pointer mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/announcements/${item.id}`}
                        className="font-medium text-foreground hover:text-primary transition-colors line-clamp-1 block text-sm"
                      >
                        {item.title}
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {item.organization}
                        </span>
                        <Badge variant="secondary" className={`text-xs font-semibold ${TYPE_COLORS[item.type]}`}>
                          {TYPE_LABELS[item.type]}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatPeriod(item.start_date, item.end_date)}
                        </span>
                      </div>
                    </div>
                    {expired ? (
                      <Badge variant="secondary" className="shrink-0 text-xs font-semibold">마감</Badge>
                    ) : (
                      <button
                        onClick={() => handleTogglePublish(item.id, !item.is_published)}
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
                          item.is_published
                            ? 'bg-primary/10 text-primary'
                            : 'bg-red-100/50 text-red-600'
                        }`}
                      >
                        {item.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
            {announcements.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">등록된 공고가 없습니다.</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                총 <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span>건
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors"
                >
                  이전
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .map((p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      return <span key={`ellipsis-${idx}`} className="px-1 text-xs text-muted-foreground">...</span>
                    }
                    return (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[28px] px-2 py-1 text-xs rounded-lg transition-colors ${
                          p === safePage ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg bg-muted text-foreground hover:bg-muted/80 disabled:opacity-40 transition-colors"
                >
                  다음
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <ConfirmModal
        type={modalType}
        count={selectedIds.size}
        onConfirm={
          modalType === 'permanent-delete'
            ? handlePermanentDelete
            : modalType === 'publish'
            ? handleBulkPublish
            : handleDelete
        }
        onCancel={() => {
          if (!deleting) setModalType(null)
        }}
      />

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  )
}
