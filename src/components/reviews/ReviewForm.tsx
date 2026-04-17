'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import type { DbReview } from '@/lib/types'
import { ReviewStars } from './ReviewStars'
import { X, Upload, Loader2 } from 'lucide-react'

interface ReviewFormProps {
  productId: number
  userId: string
  existingReview?: DbReview | null
  onSuccess: () => void
  onCancel: () => void
}

export function ReviewForm({ productId, userId, existingReview, onSuccess, onCancel }: ReviewFormProps) {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [title, setTitle] = useState(existingReview?.title || '')
  const [content, setContent] = useState(existingReview?.content || '')
  const [imageUrls, setImageUrls] = useState<string[]>(existingReview?.image_urls || [])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    const remaining = 3 - imageUrls.length
    if (remaining <= 0) {
      setError('이미지는 최대 3장까지 첨부할 수 있습니다.')
      return
    }

    const toUpload = Array.from(files).slice(0, remaining)
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) {
        setError('이미지 파일 크기는 10MB 이하여야 합니다.')
        return
      }
    }

    setUploading(true)
    setError('')
    const supabase = createClient()
    const newUrls: string[] = []

    for (const file of toUpload) {
      const ext = file.name.split('.').pop()
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('review-images')
        .upload(path, file)

      if (uploadError) {
        setError('이미지 업로드에 실패했습니다: ' + uploadError.message)
        setUploading(false)
        return
      }

      const { data: urlData } = supabase.storage.from('review-images').getPublicUrl(path)
      newUrls.push(urlData.publicUrl)
    }

    setImageUrls((prev) => [...prev, ...newUrls])
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  function removeImage(idx: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (rating === 0) {
      setError('별점을 선택해주세요.')
      return
    }
    if (!content.trim()) {
      setError('리뷰 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    // 구매 인증 확인 + 작성자 프로필 조회 (reviewer_name 스냅샷용)
    const [{ data: orderData }, { data: productData }, { data: profileData }] = await Promise.all([
      supabase
        .from('order_items')
        .select('id, order_id, orders!inner(user_id, status)')
        .eq('product_id', productId)
        .eq('orders.user_id', userId)
        .in('orders.status', ['completed', 'paid'])
        .limit(1),
      supabase
        .from('products')
        .select('is_free')
        .eq('id', productId)
        .single(),
      supabase
        .from('profiles')
        .select('name, email')
        .eq('id', userId)
        .maybeSingle(),
    ])

    const isVerifiedPurchase =
      (orderData && orderData.length > 0) || (productData?.is_free === true)

    const reviewData = {
      user_id: userId,
      product_id: productId,
      rating,
      title: title.trim(),
      content: content.trim(),
      pros: null,
      cons: null,
      image_urls: imageUrls,
      is_verified_purchase: isVerifiedPurchase,
      is_published: true,
      reviewer_name: profileData?.name || null,
      reviewer_email: profileData?.email || null,
    }

    if (existingReview) {
      const { error: updateError } = await supabase
        .from('reviews')
        .update(reviewData)
        .eq('id', existingReview.id)
        .eq('user_id', userId)

      if (updateError) {
        setError('수정에 실패했습니다: ' + updateError.message)
        setSubmitting(false)
        return
      }
    } else {
      const { error: insertError } = await supabase
        .from('reviews')
        .insert(reviewData)

      if (insertError) {
        setError('리뷰 등록에 실패했습니다: ' + insertError.message)
        setSubmitting(false)
        return
      }
    }

    // Update product review_count and review_avg
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('product_id', productId)
      .eq('is_published', true)

    if (allReviews) {
      const count = allReviews.length
      const avg = count > 0 ? allReviews.reduce((s, r) => s + r.rating, 0) / count : 0
      const { error: statsErr } = await supabase
        .from('products')
        .update({ review_count: count, review_avg: Math.round(avg * 10) / 10 })
        .eq('id', productId)
      if (statsErr) console.warn('[ReviewForm] 상품 통계 업데이트 실패:', statsErr.message)
    }

    setSubmitting(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="border border-border rounded-xl p-6 bg-white mb-6">
      <h3 className="font-semibold text-lg mb-4">
        {existingReview ? '리뷰 수정' : '리뷰 작성'}
      </h3>

      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">별점</label>
        <ReviewStars rating={rating} size={28} interactive onChange={setRating} />
      </div>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">제목</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="리뷰 제목 (선택)"
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Content */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">내용 <span className="text-red-500">*</span></label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="이 제안서가 입찰 준비에 어떻게 도움이 되었나요? 솔직한 경험을 공유해주세요."
          rows={4}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
        />
      </div>

      {/* Image Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">이미지 첨부 (최대 3장, 10MB 이하)</label>
        <div className="flex items-center gap-3 flex-wrap">
          {imageUrls.map((url, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
              <img src={url} alt="업로드 이미지 미리보기" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-0.5 right-0.5 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {imageUrls.length < 3 && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-20 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">업로드</span>
                </>
              )}
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-4">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {existingReview ? '수정하기' : '리뷰 등록'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-lg border border-border text-sm hover:bg-muted transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  )
}
