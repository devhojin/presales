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

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && selectedReview) setSelectedReview(null) }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [selectedReview])

  const loadReviews = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Count
    let countQuery = supabase
      .from('reviews')
      .select('*', { count: 'exact', head: true })

    if (ratingFilter) {
      countQuery = countQuery.eq('rating', ratingFilter)
    }

    const { count } = await countQuery
    setTotalCount(count || 0)

    // Fetch reviews
    let query = supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (ratingFilter) {
      query = query.eq('rating', ratingFilter)
    }

    const { data } = await query
    const reviewList = (data || []) as DbReview[]

    // If search, filter client-side (content/title)
    let filtered = reviewList
    if (search) {
      const s = search.toLowerCase()
      filtered = reviewList.filter(
        (r) =>
          r.title?.toLowerCase().includes(s) ||
          r.content?.toLowerCase().includes(s)
      )
    }

    setReviews(filtered)

    // Load profiles
    const userIds = [...new Set(filtered.map((r) => r.user_id).filter(Boolean))]
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
    const productIds = [...new Set(filtered.map((r) => r.product_id).filter(Boolean))]
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
    // If we just unpublished, subtract this one; if published, it's already counted
    const count = pReviews.length
    const avg = count > 0 ? pReviews.reduce((s, r) => s + r.rating, 0) / count : 0

    await supabase
      .from('products')
      .update({ review_count: count, review_avg: Math.round(avg * 10) / 10 })
      .eq('id', review.product_id)

    // Update local state
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="리뷰 내용 검색..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              ratingFilter === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className={`px-3 py-1.5 text-xs rounded-full transition-colors inline-flex items-center gap-1 ${
                ratingFilter === r
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Star className="w-3 h-3" />
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상품</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">작성자</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">별점</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">내용 미리보기</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">작성일</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">상태</th>
              <th className="text-right px-6 py-3 text-xs font-medium text-gray-500 uppercase">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  로딩 중...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                  리뷰가 없습니다
                </td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr
                  key={review.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-3 text-sm max-w-[200px] truncate">
                    {productMap[review.product_id] || '-'}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    {profileMap[review.user_id]?.name || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <ReviewStars rating={review.rating} size={14} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600 max-w-[300px] truncate">
                    {review.title ? `[${review.title}] ` : ''}
                    {review.content}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-6 py-3">
                    <Badge
                      className={`border ${
                        review.is_published
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}
                    >
                      {review.is_published ? '공개' : '숨김'}
                    </Badge>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => setSelectedReview(review)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    >
                      상세
                    </button>
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
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 transition-colors"
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
            className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">리뷰 상세</h3>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Meta */}
              <div className="space-y-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">상품</span>
                  <span className="font-medium">{productMap[selectedReview.product_id] || '-'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">작성자</span>
                  <span>{profileMap[selectedReview.user_id]?.name || '-'} ({profileMap[selectedReview.user_id]?.email || '-'})</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">별점</span>
                  <ReviewStars rating={selectedReview.rating} size={16} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">작성일</span>
                  <span>{formatDate(selectedReview.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">구매인증</span>
                  <span>{selectedReview.is_verified_purchase ? '예' : '아니오'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">도움 수</span>
                  <span>{selectedReview.helpful_count}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-3">
                {selectedReview.title && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">제목</p>
                    <p className="font-semibold text-sm">{selectedReview.title}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 mb-1">내용</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedReview.content}</p>
                </div>

                {selectedReview.pros && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-emerald-700 mb-1">좋은점</p>
                    <p className="text-sm text-emerald-800">{selectedReview.pros}</p>
                  </div>
                )}

                {selectedReview.cons && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs font-medium text-amber-700 mb-1">아쉬운점</p>
                    <p className="text-sm text-amber-800">{selectedReview.cons}</p>
                  </div>
                )}

                {selectedReview.image_urls && selectedReview.image_urls.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">첨부 이미지</p>
                    <div className="flex gap-2">
                      {selectedReview.image_urls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle Published */}
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-end">
                <button
                  onClick={() => togglePublished(selectedReview)}
                  disabled={toggling}
                  className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                    selectedReview.is_published
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
    </div>
  )
}
