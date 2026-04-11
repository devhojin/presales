'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { DbReview } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { ReviewStars } from '@/components/reviews/ReviewStars'
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Star,
  Trash2,
  MessageSquare,
  ExternalLink,
} from 'lucide-react'

interface ProfileMap {
  [userId: string]: { name: string; email: string }
}

interface ProductMap {
  [productId: number]: string
}

const PAGE_SIZE = 20

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// ===========================
// Delete Confirm Modal
// ===========================

function DeleteModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-foreground">리뷰 삭제</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-6">이 리뷰를 삭제하시겠습니까? 삭제된 리뷰는 복구할 수 없습니다.</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted rounded-xl hover:bg-muted transition-colors cursor-pointer"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors cursor-pointer"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<DbReview[]>([])
  const [profileMap, setProfileMap] = useState<ProfileMap>({})
  const [productMap, setProductMap] = useState<ProductMap>({})
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [ratingFilter, setRatingFilter] = useState<number | null>(null)
  const [selectedReview, setSelectedReview] = useState<DbReview | null>(null)
  const [toggling, setToggling] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DbReview | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replySaving, setReplySaving] = useState(false)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (deleteTarget) setDeleteTarget(null)
        else if (selectedReview) setSelectedReview(null)
      }
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [selectedReview, deleteTarget])

  // When opening a review, populate reply text
  useEffect(() => {
    if (selectedReview) {
      setReplyText(selectedReview.admin_reply || '')
    }
  }, [selectedReview])

  const loadReviews = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Build base query with server-side search
    let countQuery = supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })

    if (ratingFilter) {
      countQuery = countQuery.eq('rating', ratingFilter)
    }
    if (search.trim()) {
      countQuery = countQuery.or(
        `title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`
      )
    }

    const { count } = await countQuery
    setTotalCount(count || 0)

    // Fetch reviews with server-side search
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (ratingFilter) {
      query = query.eq('rating', ratingFilter)
    }
    if (search.trim()) {
      query = query.or(
        `title.ilike.%${search.trim()}%,content.ilike.%${search.trim()}%`
      )
    }

    const { data } = await query
    const reviewList = (data || []) as DbReview[]

    setReviews(reviewList)

    // Load profiles
    const userIds = [...new Set(reviewList.map((r) => r.user_id).filter(Boolean))]
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, email')
        .in('id', userIds)
      const pMap: ProfileMap = {}
      if (profiles) {
        for (const p of profiles) {
          pMap[p.id] = { name: p.name || '-', email: p.email || '-' }
        }
      }
      setProfileMap(pMap)
    }

    // Load product names
    const productIds = [...new Set(reviewList.map((r) => r.product_id).filter(Boolean))]
    if (productIds.length > 0) {
      const { data: products } = await supabase
        .from('products')
        .select('id, title')
        .in('id', productIds)
      const prMap: ProductMap = {}
      if (products) {
        for (const p of products) {
          prMap[p.id] = p.title
        }
      }
      setProductMap(prMap)
    }

    setLoading(false)
  }, [page, search, ratingFilter])

  useEffect(() => {
    loadReviews()
  }, [loadReviews])

  async function togglePublished(review: DbReview) {
    setToggling(true)
    const supabase = createClient()
    const newVal = !review.is_published
    await supabase
      .from('reviews')
      .update({ is_published: newVal })
      .eq('id', review.id)

    // Update product stats
    const { data: publishedReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', review.product_id)
      .eq('is_published', true)

    const pReviews = publishedReviews || []
    const count = pReviews.length
    const avg = count > 0 ? pReviews.reduce((s, r) => s + r.rating, 0) / count : 0

    await supabase
      .from('products')
      .update({ review_count: count, review_avg: Math.round(avg * 10) / 10 })
      .eq('id', review.product_id)

    setReviews((prev) =>
      prev.map((r) =>
        r.id === review.id ? { ...r, is_published: newVal } : r
      )
    )
    if (selectedReview?.id === review.id) {
      setSelectedReview({ ...selectedReview, is_published: newVal })
    }
    setToggling(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('reviews').delete().eq('id', deleteTarget.id)

    // Update product stats
    const { data: publishedReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', deleteTarget.product_id)
      .eq('is_published', true)
    const pReviews = publishedReviews || []
    const count = pReviews.length
    const avg = count > 0 ? pReviews.reduce((s, r) => s + r.rating, 0) / count : 0
    await supabase
      .from('products')
      .update({ review_count: count, review_avg: Math.round(avg * 10) / 10 })
      .eq('id', deleteTarget.product_id)

    setReviews((prev) => prev.filter((r) => r.id !== deleteTarget.id))
    setTotalCount((c) => c - 1)
    if (selectedReview?.id === deleteTarget.id) setSelectedReview(null)
    setDeleteTarget(null)
    setDeleting(false)
  }

  async function handleReplySave() {
    if (!selectedReview) return
    setReplySaving(true)
    const supabase = createClient()
    await supabase
      .from('reviews')
      .update({ admin_reply: replyText.trim() || null })
      .eq('id', selectedReview.id)
    const updated = { ...selectedReview, admin_reply: replyText.trim() || null }
    setReviews((prev) => prev.map((r) => r.id === selectedReview.id ? updated : r))
    setSelectedReview(updated)
    setReplySaving(false)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-8">리뷰 관리</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="리뷰 제목/내용 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>

        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setRatingFilter(null)
              setPage(1)
            }}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors cursor-pointer ${
              ratingFilter === null
                ? 'bg-primary text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted'
            }`}
          >
            전체
          </button>
          {[5, 4, 3, 2, 1].map((r) => (
            <button
              key={r}
              onClick={() => {
                setRatingFilter(ratingFilter === r ? null : r)
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors inline-flex items-center gap-1 cursor-pointer ${
                ratingFilter === r
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              <Star className="w-3 h-3" />
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">상품</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">작성자</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">별점</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">내용 미리보기</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">작성일</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-muted-foreground uppercase">상태</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-muted-foreground uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  로딩 중...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                  리뷰가 없습니다
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr
                  key={review.id}
                  className="hover:bg-muted transition-colors"
                >
                  <td className="px-6 py-3 text-sm max-w-[200px]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{productMap[review.product_id] || '-'}</span>
                      {review.product_id && (
                        <a
                          href={`/store/${review.product_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0 text-muted-foreground hover:text-primary transition-colors"
                          title="상품 페이지 새창에서 보기"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {profileMap[review.user_id]?.name || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <ReviewStars rating={review.rating} size={14} />
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground max-w-[300px] truncate">
                    {review.title ? `[${review.title}] ` : ''}
                    {review.content}
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        className={`border ${
                          review.is_published
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {review.is_published ? '공개' : '숨김'}
                      </Badge>
                      {review.admin_reply && (
                        <span title="관리자 답글 있음">
                          <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedReview(review)}
                        className="text-xs px-3 py-1.5 rounded-xl bg-primary/8 text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                      >
                        상세
                      </button>
                      <button
                        onClick={() => setDeleteTarget(review)}
                        className="p-1.5 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-xl hover:bg-muted disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={() => setSelectedReview(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">리뷰 상세</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeleteTarget(selectedReview)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="리뷰 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedReview(null)}
                    className="text-muted-foreground hover:text-muted-foreground cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">상품</span>
                  <span className="font-medium flex items-center gap-1.5">
                    {productMap[selectedReview.product_id] || '-'}
                    {selectedReview.product_id && (
                      <a
                        href={`/store/${selectedReview.product_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-primary transition-colors"
                        title="상품 페이지 새창에서 보기"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">작성자</span>
                  <span>{profileMap[selectedReview.user_id]?.name || '-'} ({profileMap[selectedReview.user_id]?.email || '-'})</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">별점</span>
                  <ReviewStars rating={selectedReview.rating} size={16} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">작성일</span>
                  <span>{formatDate(selectedReview.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">구매인증</span>
                  <span>{selectedReview.is_verified_purchase ? '예' : '아니오'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">도움 수</span>
                  <span>{selectedReview.helpful_count}</span>
                </div>
              </div>

              <div className="border-t border-border pt-4 space-y-3">
                {selectedReview.title && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">제목</p>
                    <p className="font-semibold text-sm">{selectedReview.title}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">내용</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedReview.content}</p>
                </div>

                {selectedReview.pros && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1">좋은점</p>
                    <p className="text-sm text-emerald-700">{selectedReview.pros}</p>
                  </div>
                )}

                {selectedReview.cons && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">아쉬운점</p>
                    <p className="text-sm text-amber-800">{selectedReview.cons}</p>
                  </div>
                )}

                {selectedReview.image_urls && selectedReview.image_urls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">첨부 이미지</p>
                    <div className="flex gap-2">
                      {selectedReview.image_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-24 h-24 rounded-xl overflow-hidden border border-border hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt="리뷰 이미지" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Reply */}
              <div className="border-t border-border mt-4 pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  관리자 답글
                </p>
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="고객에게 공개될 답글을 입력하세요..."
                  rows={3}
                  className="w-full text-sm text-foreground bg-muted border border-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleReplySave}
                    disabled={replySaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {replySaving ? '저장 중...' : '답글 저장'}
                  </button>
                </div>
              </div>

              {/* Toggle Published */}
              <div className="border-t border-border mt-4 pt-4 flex justify-end">
                <button
                  onClick={() => togglePublished(selectedReview)}
                  disabled={toggling}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                    selectedReview.is_published
                      ? 'bg-muted text-foreground hover:bg-muted'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {selectedReview.is_published ? (
                    <>
                      <EyeOff className="w-4 h-4" />
                      숨김 처리
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      공개 처리
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteModal
          onConfirm={() => {
            if (deleting) return
            handleDelete()
          }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
