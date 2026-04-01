'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { type DbProduct, type DbCategory, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ShoppingCart, Heart, Check, Download, Play, Star, PenLine, BookOpen } from 'lucide-react'
import { PdfPreviewModal } from '@/components/pdf-preview-modal'

type TabId = 'info' | 'video' | 'review'

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<DbProduct | null>(null)
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<DbProduct[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const { toggleItem, isInCart } = useCartStore()

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data }, { data: catData }] = await Promise.all([
        supabase
          .from('products')
          .select('*, categories(id, name, slug)')
          .eq('id', Number(id))
          .single(),
        supabase.from('categories').select('*').order('sort_order'),
      ])
      setCategories(catData || [])

      if (data) {
        setProduct(data)
        // Load related: find products with overlapping category_ids
        const productCatIds = data.category_ids && data.category_ids.length > 0
          ? data.category_ids
          : data.category_id ? [data.category_id] : []

        if (productCatIds.length > 0) {
          const { data: allPublished } = await supabase
            .from('products')
            .select('*, categories(id, name, slug)')
            .eq('is_published', true)
            .neq('id', data.id)

          const relatedProducts = (allPublished || []).filter((p) => {
            const pCatIds = p.category_ids && p.category_ids.length > 0
              ? p.category_ids
              : p.category_id ? [p.category_id] : []
            return pCatIds.some((cid: number) => productCatIds.includes(cid))
          }).slice(0, 3)
          setRelated(relatedProducts)
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const categoryMap = new Map<number, string>()
  categories.forEach((c) => categoryMap.set(c.id, c.name))

  const getCategoryNames = (p: DbProduct): string[] => {
    if (p.category_ids && p.category_ids.length > 0) {
      return p.category_ids.map((cid) => categoryMap.get(cid) || '').filter(Boolean)
    }
    if (p.categories?.name) return [p.categories.name]
    return ['문서']
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-4 bg-muted rounded w-40" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="aspect-[4/3] bg-muted rounded-xl" />
            <div className="space-y-4">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-8 bg-muted rounded w-full" />
              <div className="h-6 bg-muted rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="text-muted-foreground text-lg">상품을 찾을 수 없습니다</p>
        <Link href="/store" className="text-primary mt-4 inline-block">스토어로 돌아가기</Link>
      </div>
    )
  }

  const discount = product.original_price > product.price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0
  const inCart = isInCart(product.id)

  const tabs: { id: TabId; label: string }[] = [
    { id: 'info', label: '상품정보' },
    { id: 'video', label: '동영상 보기' },
    { id: 'review', label: '리뷰' },
  ]

  return (
    <div className="container mx-auto px-4 py-10">
      <Link href="/store" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> 스토어로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative rounded-xl overflow-hidden bg-muted flex items-center justify-center" style={{ minHeight: '300px' }}>
          {product.thumbnail_url ? (
            <img src={product.thumbnail_url} alt={product.title} className="w-full h-auto object-contain" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
              <span className="text-6xl">📄</span>
            </div>
          )}
          <Badge className={`absolute top-4 left-4 border ${product.is_free ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {product.is_free ? '무료' : '유료'}
          </Badge>
        </div>

        {/* PDF Preview Button */}
        {product.preview_pdf_url && (
          <button
            onClick={() => setShowPdfPreview(true)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 text-sm font-medium text-gray-700 -mt-4 lg:col-span-2 lg:-mt-0"
          >
            <BookOpen className="w-4 h-4" />
            📖 문서 미리보기 ▶️
          </button>
        )}

        {/* Info */}
        <div className="space-y-6">
          <div>
            <div className="flex gap-2 flex-wrap mb-1">
              {getCategoryNames(product).map((name) => (
                <span key={name} className="text-sm text-muted-foreground">{name}</span>
              ))}
            </div>
            <h1 className="text-2xl font-bold">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            {product.is_free ? (
              <span className="text-3xl font-bold text-emerald-600">무료</span>
            ) : (
              <>
                <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
                {product.original_price > product.price && (
                  <span className="text-lg text-muted-foreground line-through">{formatPrice(product.original_price)}</span>
                )}
                {discount > 0 && <Badge className="bg-red-500 text-white border-0">-{discount}%</Badge>}
              </>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.format && (
              <div>
                <p className="text-muted-foreground">파일 형식</p>
                <p className="font-medium">{product.format}</p>
              </div>
            )}
            {product.pages && (
              <div>
                <p className="text-muted-foreground">페이지 수</p>
                <p className="font-medium">{product.pages}p</p>
              </div>
            )}
            {product.file_size && (
              <div>
                <p className="text-muted-foreground">파일 크기</p>
                <p className="font-medium">{product.file_size}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">카테고리</p>
              <p className="font-medium">{getCategoryNames(product).join(', ') || '-'}</p>
            </div>
          </div>

          <Separator />

          {product.description && !product.description_html && (
            <div>
              <h3 className="font-semibold mb-2">상품 설명</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">#{tag}</Badge>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => toggleItem({
                productId: product.id,
                title: product.title,
                price: product.price,
                originalPrice: product.original_price,
                thumbnail: product.thumbnail_url || '',
                format: product.format || '',
              })}
              className={`flex-1 h-12 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors ${
                inCart
                  ? 'bg-muted text-muted-foreground border border-border'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {inCart ? <><Check className="w-4 h-4" /> 장바구니에 담김</> :
                product.is_free ? <><Download className="w-4 h-4" /> 무료 다운로드</> :
                <><ShoppingCart className="w-4 h-4" /> 장바구니 담기</>}
            </button>
            <button className="h-12 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">⚠️ 디지털 상품 특성상 다운로드 후 환불이 제한될 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-12">
        <div className="border-b border-border sticky top-0 bg-background z-10">
          <nav className="flex gap-0 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="py-8">
          {/* 상품정보 Tab */}
          {activeTab === 'info' && (
            <div>
              {product.description_html ? (
                <div
                  className="product-description text-[15px]"
                  dangerouslySetInnerHTML={{ __html: product.description_html }}
                />
              ) : product.description ? (
                <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <p>등록된 상품 상세 정보가 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 동영상 보기 Tab */}
          {activeTab === 'video' && (
            <div>
              {product.youtube_id ? (
                <div className="max-w-3xl mx-auto">
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${product.youtube_id}`}
                      className="absolute inset-0 w-full h-full rounded-lg"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-4">
                    <Play className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">등록된 동영상이 없습니다.</p>
                </div>
              )}
            </div>
          )}

          {/* 리뷰 Tab */}
          {activeTab === 'review' && (
            <div>
              {/* Average Rating Placeholder */}
              <div className="flex items-center gap-6 mb-8 p-6 bg-muted/30 rounded-xl">
                <div className="text-center">
                  <p className="text-4xl font-bold text-primary">0.0</p>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star key={i} className="w-4 h-4 text-gray-300" />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">0개 리뷰</p>
                </div>
                <Separator orientation="vertical" className="h-16" />
                <div className="flex-1 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => (
                    <div key={star} className="flex items-center gap-2 text-xs">
                      <span className="w-4 text-right text-muted-foreground">{star}</span>
                      <Star className="w-3 h-3 text-gray-300" />
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-400 rounded-full" style={{ width: '0%' }} />
                      </div>
                      <span className="w-6 text-right text-muted-foreground">0</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Empty State */}
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">아직 리뷰가 없습니다.</p>
                <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                  <PenLine className="w-4 h-4" />
                  리뷰 작성
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">관련 템플릿</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/store/${p.id}`} className="group">
                <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                        <span className="text-4xl">📄</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2">{p.title}</h3>
                    <p className="text-primary font-bold mt-2">
                      {p.is_free ? '무료' : formatPrice(p.price)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {product.preview_pdf_url && (
        <PdfPreviewModal
          isOpen={showPdfPreview}
          onClose={() => setShowPdfPreview(false)}
          pdfUrl={product.preview_pdf_url}
          totalPages={product.pages || 30}
          previewClearPages={product.preview_clear_pages || 0}
          previewBlurPages={product.preview_blur_pages || 2}
          productTitle={product.title}
          price={product.price}
          onPurchaseClick={() => {
            setShowPdfPreview(false)
            toggleItem({
              productId: product.id,
              title: product.title,
              price: product.price,
              originalPrice: product.original_price,
              thumbnail: product.thumbnail_url || '',
              format: product.format || '',
            })
          }}
        />
      )}
    </div>
  )
}
