export interface DbProduct {
  id: number
  title: string
  description: string | null
  description_html: string | null
  youtube_id: string | null
  preview_pdf_url: string | null
  preview_clear_pages: number
  preview_blur_pages: number
  preview_note: string | null
  price: number
  original_price: number
  category_id: number | null
  category_ids: number[] | null
  tier: string | null
  format: string | null
  pages: number | null
  file_size: string | null
  thumbnail_url: string | null
  tags: string[]
  is_published: boolean
  is_free: boolean
  download_count: number
  review_count: number
  review_avg: number
  created_at: string
  updated_at: string
  related_product_ids: number[] | null
  preview_images: string[] | null
  overview: Record<string, unknown> | { points?: string[]; summary?: string } | null
  features: Record<string, unknown> | { items?: { title: string; description?: string }[] } | null
  specs: Record<string, unknown> | { items?: { label: string; value: string }[] } | null
  file_types: Record<string, unknown> | { items?: string[] } | null
  seller: string | null
  document_orientation: string | null
  categories?: { id: number; name: string; slug: string } | null
}

export interface DbCategory {
  id: number
  name: string
  slug: string
  sort_order: number
}

export const formatPrice = (price: number) => {
  if (price === 0) return '무료'
  return new Intl.NumberFormat('ko-KR').format(price) + '원'
}

export interface DbReview {
  id: number
  user_id: string
  product_id: number
  rating: number
  title: string
  content: string
  image_urls: string[]
  helpful_count: number
  is_published: boolean
  is_verified_purchase: boolean
  admin_reply: string | null
  created_at: string
  reviewer_name: string | null
  reviewer_email: string | null
  products?: { title: string } | null
}

export interface DbReviewHelpful {
  id: number
  user_id: string
  review_id: number
}

export interface DbProductDiscountMatch {
  id: number
  source_product_id: number
  target_product_id: number
  discount_type: 'auto' | 'manual'
  discount_amount: number
  is_active: boolean
  created_at: string
  updated_at: string
  source_product?: DbProduct
  target_product?: DbProduct
}

export const priceTypes = [
  { id: 'free', label: '무료', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'paid', label: '유료', color: 'bg-blue-50 text-blue-700 border-blue-200' },
] as const
