export interface DbProduct {
  id: number
  title: string
  description: string | null
  description_html: string | null
  price: number
  original_price: number
  category_id: number | null
  tier: 'basic' | 'premium' | 'package'
  format: string | null
  pages: number | null
  file_size: string | null
  thumbnail_url: string | null
  tags: string[]
  is_published: boolean
  is_free: boolean
  download_count: number
  created_at: string
  updated_at: string
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

export const allTiers = [
  { id: 'basic', label: '기본', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'premium', label: '프리미엄', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'package', label: '패키지', color: 'bg-amber-50 text-amber-700 border-amber-200' },
] as const
