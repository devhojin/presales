'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { DbReview } from '@/lib/types'
import { ReviewStars } from './ReviewStars'
import { ReviewForm } from './ReviewForm'
import { ImageLightbox } from './ImageLightbox'
import { ConfirmModal } from './ConfirmModal'
import { Star, ThumbsUp, PenLine, ChevronLeft, ChevronRight, ShieldCheck, Pencil, Trash2, Coins } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

type SortOption = 'latest' | 'rating_high' | 'rating_low' | 'helpful'

interface ProductReviewsProps {
  productId: number
}

interface PublicRewardSettings {
  enabled: boolean
  reviewBonus: number
}

const REVIEWS_PER_PAGE = 10

function formatWon(amount: number) {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<DbReview[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [ratingDist, setRatingDist] = useState<number[]>([0, 0, 0, 0, 0])
  const [avgRating, setAvgRating] = useState(0)
  const [sort, setSort] = useState<SortOption>('latest')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [userReview, setUserReview] = useState<DbReview | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingReview, setEditingReview] = useState<DbReview | null>(null)
  const [helpfulSet, setHelpfulSet] = useState<Set<number>>(new Set())
  const [lightboxImages, setLightboxImages] = useState<string[] | null>(null)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<DbReview | null>(null)
  const [reviewRewardAmount, setReviewRewardAmount] = useState(0)

  // Load user
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u)
    })
  }, [])

  useEffect(() => {
    let active = true
    fetch('/api/rewards/settings', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as Partial<PublicRewardSettings>
      })
      .then((data) => {
        if (!active || !data || data.enabled === false) return
        const amount = Number(data.reviewBonus ?? 0)
        setReviewRewardAmount(Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0)
      })
      .catch(() => {
        if (active) setReviewRewardAmount(0)
      })

    return () => {
      active = false
    }
  }, [])

  // Check purchase status and existing review
  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    // Check if user has bought the product or downloaded the free file.
    Promise.all([
      supabase
        .from('order_items')
        .select('id, orders!inner(user_id, status)')
        .eq('product_id', productId)
        .eq('orders.user_id', user.id)
        .in('orders.status', ['paid', 'completed'])
        .limit(1),
      supabase
        .from('download_logs')
        .select('id')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .limit(1),
    ]).then(([orderResult, downloadResult]) => {
      setHasPurchased(
        (orderResult.data?.length ?? 0) > 0 ||
        (downloadResult.data?.length ?? 0) > 0,
      )
    })

    // Check if user already wrote a review
    supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('user_id', user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setUserReview(data as DbReview)
      })

    // Load helpful status
    supabase
      .from('review_helpful')
      .select('review_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setHelpfulSet(new Set(data.map((h) => h.review_id)))
      })
  }, [user, productId])

  // Load reviews
  const loadReviews = useCallback(async () => {
    const supabase = createClient()

    // Get rating distribution
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_published', true)

    if (allReviews) {
      const dist = [0, 0, 0, 0, 0]
      let sum = 0
      allReviews.forEach((r) => {
        dist[r.rating - 1]++
        sum += r.rating
      })
      setRatingDist(dist)
      setTotalCount(allReviews.length)
      setAvgRating(allReviews.length > 0 ? sum / allReviews.length : 0)
    }

    // Get paginated reviews (no embedded join — uses denormalized reviewer_name column)
    let query = supabase
      .from('reviews')
      .select('*')
      .eq('product_id', productId)
      .eq('is_published', true)

    switch (sort) {
      case 'latest':
        query = query.order('created_at', { ascending: false })
        break
      case 'rating_high':
        query = query.order('rating', { ascending: false }).order('created_at', { ascending: false })
        break
      case 'rating_low':
        query = query.order('rating', { ascending: true }).order('created_at', { ascending: false })
        break
      case 'helpful':
        query = query.order('helpful_count', { ascending: false }).order('created_at', { ascending: false })
        break
    }

    const from = (page - 1) * REVIEWS_PER_PAGE
    query = query.range(from, from + REVIEWS_PER_PAGE - 1)

    const { data } = await query
    setReviews((data || []) as DbReview[])
    setLoading(false)
  }, [productId, sort, page])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadReviews()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadReviews])

  const totalPages = Math.ceil(totalCount / REVIEWS_PER_PAGE)

  function maskName(name: string | null | undefined): string {
    if (!name || name.length === 0) return '익명'
    if (name.length === 1) return name + 'OO'
    return name[0] + 'OO'
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  }

  async function toggleHelpful(reviewId: number) {
    if (!user) return
    const supabase = createClient()
    const isHelpful = helpfulSet.has(reviewId)

    if (isHelpful) {
      const { error } = await supabase
        .from('review_helpful')
        .delete()
        .eq('user_id', user.id)
        .eq('review_id', reviewId)
      if (error) { alert(`도움됨 취소 실패: ${error.message}`); return }
      setHelpfulSet((prev) => {
        const next = new Set(prev)
        next.delete(reviewId)
        return next
      })
      const { error: rpcErr } = await supabase.rpc('decrement_helpful', { rid: reviewId })
      if (rpcErr) console.warn('[reviews] helpful_count 감소 실패:', rpcErr.message)
    } else {
      const { error } = await supabase
        .from('review_helpful')
        .insert({ user_id: user.id, review_id: reviewId })
      if (error) { alert(`도움됨 등록 실패: ${error.message}`); return }
      setHelpfulSet((prev) => new Set(prev).add(reviewId))
      const { error: rpcErr } = await supabase.rpc('increment_helpful', { rid: reviewId })
      if (rpcErr) console.warn('[reviews] helpful_count 증가 실패:', rpcErr.message)
    }

    // Update local state
    setReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, helpful_count: r.helpful_count + (isHelpful ? -1 : 1) }
          : r
      )
    )
  }

  async function handleDelete() {
    if (!deleteTarget || !user) return
    const supabase = createClient()
    const { error: delError } = await supabase
      .from('reviews')
      .delete()
      .eq('id', deleteTarget.id)
      .eq('user_id', user.id)
    if (delError) {
      alert(`리뷰 삭제에 실패했습니다: ${delError.message}`)
      return
    }

    // Update product stats
    const { data: remaining } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_published', true)

    const count = remaining?.length ?? 0
    const avg = count > 0 ? (remaining ?? []).reduce((s, r) => s + r.rating, 0) / count : 0

    const { error: statsErr } = await supabase
      .from('products')
      .update({ review_count: count, review_avg: Math.round(avg * 10) / 10 })
      .eq('id', productId)
    if (statsErr) console.warn('[reviews] 상품 통계 업데이트 실패:', statsErr.message)

    setDeleteTarget(null)
    setUserReview(null)
    loadReviews()
  }

  function handleFormSuccess() {
    setShowForm(false)
    setEditingReview(null)
    // Reload user review
    if (user) {
      const supabase = createClient()
      supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .eq('user_id', user.id)
        .limit(1)
        .single()
        .then(({ data }) => {
          if (data) setUserReview(data as DbReview)
        })
    }
    loadReviews()
  }

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'latest', label: '최신순' },
    { value: 'rating_high', label: '평점높은순' },
    { value: 'rating_low', label: '평점낮은순' },
    { value: 'helpful', label: '도움순' },
  ]

  return (
    <div>
      {/* Review Summary */}
      <div className="flex items-center gap-6 mb-8 p-6 bg-muted/30 rounded-xl">
        <div className="text-center min-w-[80px]">
          <p className="text-4xl font-bold text-primary">{avgRating.toFixed(1)}</p>
          <div className="flex items-center justify-center gap-0.5 mt-1">
            <ReviewStars rating={Math.round(avgRating)} size={16} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{totalCount}개 리뷰</p>
        </div>
        <div className="h-16 w-px bg-border" />
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = ratingDist[star - 1]
            const pct = totalCount > 0 ? (count / totalCount) * 100 : 0
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-right text-muted-foreground">{star}</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-muted-foreground">{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Write Review Button / Form */}
      {showForm || editingReview ? (
        <ReviewForm
          productId={productId}
          userId={user?.id || ''}
          existingReview={editingReview}
          rewardAmount={reviewRewardAmount}
          onSuccess={handleFormSuccess}
          onCancel={() => {
            setShowForm(false)
            setEditingReview(null)
          }}
        />
      ) : (
        <div className="mb-6">
          {user && hasPurchased && !userReview && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <PenLine className="w-4 h-4" />
                글쓰기
              </button>
              {reviewRewardAmount > 0 && (
                <p className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700">
                  <Coins className="h-4 w-4" />
                  후기 등록 시 {formatWon(reviewRewardAmount)} 적립
                </p>
              )}
            </div>
          )}
          {!user && (
            <p className="text-sm text-muted-foreground">리뷰를 작성하려면 로그인이 필요합니다.</p>
          )}
          {user && !hasPurchased && !userReview && (
            <p className="text-sm text-muted-foreground">무료 다운로드 또는 구매 후 글쓰기가 가능합니다.</p>
          )}
        </div>
      )}

      {/* Sort */}
      {totalCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setSort(opt.value)
                setPage(1)
              }}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                sort === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Review List */}
      {loading ? (
        <div className="py-12 text-center text-muted-foreground">불러오는 중...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">아직 리뷰가 없습니다. 이 제안서로 입찰에 성공하셨다면 경험을 공유해주세요!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="border border-border rounded-xl p-5 bg-white">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{maskName(review.reviewer_name)}</span>
                  {review.is_verified_purchase && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      <ShieldCheck className="w-3 h-3" />
                      구매인증
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <ReviewStars rating={review.rating} size={14} />
                  <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
                </div>
              </div>

              {/* Title */}
              {review.title && (
                <h4 className="font-semibold text-sm mb-2">{review.title}</h4>
              )}

              {/* Content */}
              {review.content && (
                <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">{review.content}</p>
              )}

              {/* Images */}
              {review.image_urls && review.image_urls.length > 0 && (
                <div className="flex gap-2 mb-3 mt-3">
                  {review.image_urls.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setLightboxImages(review.image_urls)
                        setLightboxIndex(idx)
                      }}
                      className="w-20 h-20 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                    >
                      <img src={url} alt="리뷰 이미지" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                <button
                  onClick={() => user && toggleHelpful(review.id)}
                  disabled={!user}
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                    helpfulSet.has(review.id)
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  도움이 됐어요 {review.helpful_count > 0 && review.helpful_count}
                </button>

                {user && user.id === review.user_id && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingReview(review)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      수정
                    </button>
                    <button
                      onClick={() => setDeleteTarget(review)}
                      className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-lg text-sm transition-colors ${
                p === page
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxImages && (
        <ImageLightbox
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxImages(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="리뷰 삭제"
        message="이 리뷰를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
