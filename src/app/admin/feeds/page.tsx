'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import {
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Loader2,
  X,
  CheckSquare,
  Square,
  AlertCircle,
  Rss,
} from 'lucide-react'
import { getSourceBadgeStyle, getSourceName, getCategoryLabel, getCategoryColor, FEED_CATEGORIES } from '@/lib/feed-sources'

// ===========================
// Types
// ===========================

interface FeedItem {
  id: string
  title: string
  source: string
  source_name: string
  category: string
  views: number
  is_published: boolean
  external_url: string | null
  created_at: string
}

type PublishTab = 'all' | 'published' | 'unpublished'
type ModalType = 'delete' | 'permanentDelete' | null

const PAGE_SIZES = [20, 50, 100] as const

// ===========================
// Confirm Modal
// ===========================

function ConfirmModal({
  type,
  count,
  onConfirm,
  onCancel,
}: {
  type: ModalType
  count: number
  onConfirm: () => void
  onCancel: () => void
}) {
  const isPerma = type === 'permanentDelete'

  useEffect(() => {
    if (!type) return
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [type, onCancel])

  if (!type) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div
        className="bg-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          {isPerma ? (
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-destructive" />
            </div>
          )}
          <h3 className="text-lg font-bold text-foreground">
            {isPerma ? '완전삭제 확인' : '선택 삭제 확인'}
          </h3>
        </div>

        <div className="text-sm text-muted-foreground space-y-2 mb-6">
          {isPerma ? (
            <>
              <p>
                선택한 <strong>{count}건</strong>의 피드를 완전삭제하시겠습니까?
              </p>
              <p className="text-destructive font-medium">완전삭제된 피드는 다음 수집에서도 영구 차단됩니다.</p>
              <p className="text-destructive font-medium">이 작업은 되돌릴 수 없습니다.</p>
            </>
          ) : (
            <>
              <p>
                선택한 <strong>{count}건</strong>의 피드를 삭제하시겠습니까?
              </p>
              <p className="text-muted-foreground">다음 수집 시 다시 불러올 수 있습니다.</p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-primary-foreground rounded-lg transition-colors ${
              isPerma ? 'bg-destructive hover:bg-destructive/90' : 'bg-destructive hover:bg-destructive/90'
            }`}
          >
            {isPerma ? '완전삭제' : '삭제'}
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
    <div className="fixed bottom-6 left-1/2 z-[70] -translate-x-1/2">
      <div className="bg-foreground text-primary-foreground px-4 py-3 rounded-lg shadow-lg text-sm font-medium">
        {message}
      </div>
    </div>
  )
}

// ===========================
// Page Component
// ===========================

export default function AdminFeedsPage() {
  const supabase = useMemo(() => createClient(), [])

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<PublishTab>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [feeds, setFeeds] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [fetchingNow, setFetchingNow] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [modalType, setModalType] = useState<ModalType>(null)

  const [pageSize, setPageSize] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  const [tabCounts, setTabCounts] = useState({ all: 0, published: 0, unpublished: 0 })
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Fetch feeds from database
  const fetchFeeds = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      let query = supabase.from('community_posts').select('*').order('created_at', { ascending: false })

      // Apply tab filter
      if (tab !== 'all') {
        query = query.eq('is_published', tab === 'published')
      }

      // Apply category filter
      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter)
      }

      // Apply search
      if (search.trim()) {
        query = query.ilike('title', `%${search.trim()}%`)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      const items = (data || []) as FeedItem[]
      setFeeds(items)

      // Calculate counts
      const counts = {
        all: items.length,
        published: items.filter((f) => f.is_published).length,
        unpublished: items.filter((f) => !f.is_published).length,
      }
      setTabCounts(counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : '데이터를 불러오는 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }, [supabase, tab, categoryFilter, search])

  useEffect(() => {
    fetchFeeds()
  }, [fetchFeeds])

  // Pagination
  const totalItems = feeds.length
  const totalPages = Math.ceil(totalItems / pageSize)
  const safePage = Math.min(currentPage, totalPages || 1)
  const pagedFeeds = feeds.slice((safePage - 1) * pageSize, safePage * pageSize)

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
  }, [])

  // Handle fetch now
  const handleFetchNow = async () => {
    setFetchingNow(true)
    try {
      const res = await fetch('/api/admin/feeds/trigger-fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()
      showToast(result.message || '수집 완료')
      await fetchFeeds()
    } catch {
      showToast('수집 중 오류가 발생했습니다')
    }
    setFetchingNow(false)
  }

  // Toggle publish
  const handleTogglePublish = async (id: string, publish: boolean) => {
    try {
      const { error: updateError } = await supabase.from('community_posts').update({ is_published: publish }).eq('id', id)
      if (updateError) throw updateError
      setFeeds((prev) => prev.map((f) => (f.id === id ? { ...f, is_published: publish } : f)))
      showToast(publish ? '공개로 전환되었습니다' : '비공개로 전환되었습니다')
    } catch {
      showToast('상태 변경에 실패했습니다')
    }
  }

  // Delete selected
  const handleDelete = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const { error: delError } = await supabase.from('community_posts').delete().in('id', ids)
      if (delError) throw delError
      setSelectedIds(new Set())
      showToast(`${ids.length}건 삭제되었습니다`)
      await fetchFeeds()
    } catch {
      showToast('삭제에 실패했습니다')
    } finally {
      setDeleting(false)
      setModalType(null)
    }
  }

  // Permanent delete
  const handlePermanentDelete = async () => {
    setDeleting(true)
    try {
      const ids = Array.from(selectedIds)
      const selectedFeeds = feeds.filter((f) => ids.includes(f.id))

      // Add to blocked list
      const toBlock = selectedFeeds
        .filter((f) => f.source !== 'manual')
        .map((f) => ({
          source: f.source,
          external_id: f.id,
          title: f.title,
          reason: '관리자 완전삭제',
        }))

      if (toBlock.length > 0) {
        const { error: blockError } = await supabase
          .from('blocked_community_posts')
          .upsert(toBlock, { onConflict: 'source,external_id' })
        if (blockError) throw blockError
      }

      const { error: delError } = await supabase.from('community_posts').delete().in('id', ids)
      if (delError) throw delError

      setSelectedIds(new Set())
      showToast(`${ids.length}건 완전삭제되었습니다`)
      await fetchFeeds()
    } catch {
      showToast('완전삭제에 실패했습니다')
    } finally {
      setDeleting(false)
      setModalType(null)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedFeeds.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagedFeeds.map((f) => f.id)))
    }
  }

  const TABS: { key: PublishTab; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'published', label: '공개' },
    { key: 'unpublished', label: '비공개' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Rss className="w-6 h-6 text-primary" />
              IT피드 관리
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">스타트업 뉴스, 정책소식, 입찰공고 등을 관리합니다</p>
        </div>
        <button
          onClick={handleFetchNow}
          disabled={fetchingNow}
          className="px-4 py-2 text-sm font-medium rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${fetchingNow ? 'animate-spin' : ''}`} />
          {fetchingNow ? '수집 중...' : '지금 불러오기'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key)
              setCurrentPage(1)
              setSelectedIds(new Set())
            }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
              tab === t.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {t.label}
            <span className="ml-2 text-xs opacity-75">{tabCounts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCategoryFilter('all')
            setCurrentPage(1)
          }}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
            categoryFilter === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-foreground hover:bg-secondary/80'
          }`}
        >
          전체
        </button>
        {FEED_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setCategoryFilter(cat.id)
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              categoryFilter === cat.id
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search + Page size */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="제목으로 검색..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {search && (
            <button
              onClick={() => {
                setSearch('')
                setCurrentPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground mr-1">보기</span>
          {PAGE_SIZES.map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              className={`px-2 py-1 rounded-md text-xs font-medium transition ${
                pageSize === size
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-secondary/80'
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-secondary p-3 rounded-xl">
          <span className="text-xs font-medium text-foreground">{selectedIds.size}건 선택</span>
          <button
            onClick={() => setModalType('delete')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-primary-foreground hover:bg-destructive/90 flex items-center gap-1 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            삭제
          </button>
          <button
            onClick={() => setModalType('permanentDelete')}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive/80 text-primary-foreground hover:bg-destructive transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            완전삭제
          </button>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <AlertCircle className="w-8 h-8 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <button
            onClick={fetchFeeds}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            재시도
          </button>
        </div>
      ) : pagedFeeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Rss className="w-10 h-10 mb-3 opacity-30" />
          <p className="text-sm">{totalItems === 0 ? '등록된 피드가 없습니다' : '검색 결과가 없습니다'}</p>
        </div>
      ) : (
        <>
          {/* Feed list table */}
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border/50 bg-secondary/30">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-foreground w-12">
                    <button
                      onClick={toggleSelectAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedIds.size === pagedFeeds.length ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">제목</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">출처</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">카테고리</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">조회</th>
                  <th className="px-4 py-3 text-left font-medium text-foreground">상태</th>
                  <th className="px-4 py-3 text-right font-medium text-foreground">작업</th>
                </tr>
              </thead>
              <tbody>
                {pagedFeeds.map((feed) => (
                  <tr key={feed.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleSelect(feed.id)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {selectedIds.has(feed.id) ? (
                          <CheckSquare className="w-4 h-4 text-primary" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          {feed.external_url ? (
                            <a
                              href={feed.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline truncate block"
                              title={feed.title}
                            >
                              {feed.title}
                            </a>
                          ) : (
                            <p className="font-medium text-foreground truncate">{feed.title}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-[11px] font-semibold ${getSourceBadgeStyle(feed.source)}`}>
                        {getSourceName(feed.source)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-[11px] font-semibold ${getCategoryColor(feed.category)}`}>
                        {getCategoryLabel(feed.category)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{feed.views.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleTogglePublish(feed.id, !feed.is_published)}
                        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                          feed.is_published
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {feed.is_published ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            공개
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            비공개
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {feed.external_url && (
                          <a
                            href={feed.external_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"
                            title="외부 링크 열기"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-card rounded-2xl border border-border/50">
              <p className="text-xs text-muted-foreground">
                전체 <strong className="text-foreground">{totalItems.toLocaleString()}</strong>건 중{' '}
                {((safePage - 1) * pageSize + 1).toLocaleString()}~
                {Math.min(safePage * pageSize, totalItems).toLocaleString()}건
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage <= 1}
                  className="px-2 py-1 text-xs rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="px-2 py-1 text-xs rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                  const pageNum = start + i
                  if (pageNum > totalPages) return null
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        pageNum === safePage
                          ? 'bg-primary text-primary-foreground'
                          : 'border border-border hover:bg-secondary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage >= totalPages}
                  className="px-2 py-1 text-xs rounded-lg border border-border disabled:opacity-30 hover:bg-secondary transition-colors"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <ConfirmModal
        type={modalType}
        count={selectedIds.size}
        onConfirm={modalType === 'permanentDelete' ? handlePermanentDelete : handleDelete}
        onCancel={() => setModalType(null)}
      />

      {/* Toast */}
      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg(null)} />}
    </div>
  )
}
