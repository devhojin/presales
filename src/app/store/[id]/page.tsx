'use client'

import { useState, useEffect, use } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { type DbProduct, type DbCategory, formatPrice } from '@/lib/types'
import { useCartStore } from '@/stores/cart-store'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, ShoppingCart, Heart, Check, Download, Play, BookOpen, FileDown } from 'lucide-react'
import { PdfPreviewModal } from '@/components/pdf-preview-modal'
import { ProductReviews } from '@/components/reviews/ProductReviews'

type TabId = 'info' | 'video' | 'review'

interface ProductFile {
  id: number
  product_id: number
  file_name: string
  file_url: string
  file_size: string | null
  created_at: string
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<DbProduct | null>(null)
  const [categories, setCategories] = useState<DbCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [related, setRelated] = useState<DbProduct[]>([])
  const [activeTab, setActiveTab] = useState<TabId>('info')
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [hasPurchased, setHasPurchased] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [productFiles, setProductFiles] = useState<ProductFile[]>([])
  const [downloading, setDownloading] = useState(false)
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

        // Load product files
        const { data: filesData } = await supabase
          .from('product_files')
          .select('*')
          .eq('product_id', data.id)
          .order('created_at', { ascending: true })
        setProductFiles(filesData || [])

        // Check purchase status (무료 = 로그인만 하면 다운로드, 유료 = 결제 필요)
        const { data: { user } } = await supabase.auth.getUser()
        setIsLoggedIn(!!user)
        if (user) {
          if (data.is_free) {
            // 무료 상품: 로그인만 하면 다운로드 가능
            setHasPurchased(true)
          } else {
            const { data: paidOrders } = await supabase
              .from('orders')
              .select('id, order_items!inner(product_id)')
              .eq('user_id', user.id)
              .eq('status', 'paid')
              .eq('order_items.product_id', data.id)
            setHasPurchased((paidOrders && paidOrders.length > 0) || false)
          }
        }

        // Load related: use related_product_ids if set, otherwise fall back to category matching
        const relatedIds = Array.isArray(data.related_product_ids) && data.related_product_ids.length > 0
          ? data.related_product_ids
          : null

        if (relatedIds) {
          const { data: relatedData } = await supabase
            .from('products')
            .select('*, categories(id, name, slug)')
            .in('id', relatedIds)
            .eq('is_published', true)
          // Preserve the order from related_product_ids
          const relatedMap = new Map((relatedData || []).map(p => [p.id, p]))
          setRelated(relatedIds.map((rid: number) => relatedMap.get(rid)).filter(Boolean) as DbProduct[])
        } else {
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
            }).slice(0, 10)
            setRelated(relatedProducts)
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [id])

  const canDownload = hasPurchased // 무료든 유료든 로그인+조건 충족 시 true

  async function handleDownload(fileUrl?: string, fileName?: string) {
    if (!product) return
    setDownloading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      // Log the download
      if (user) {
        await supabase.from('download_logs').insert({
          user_id: user.id,
          product_id: product.id,
          file_name: fileName || product.title,
        })
      }

      // Increment download count
      await supabase
        .from('products')
        .update({ download_count: (product.download_count || 0) + 1 })
        .eq('id', product.id)
      setProduct(prev => prev ? { ...prev, download_count: prev.download_count + 1 } : prev)

      // Trigger file download
      const url = fileUrl || productFiles[0]?.file_url
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = fileName || ''
        a.target = '_blank'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } finally {
      setDownloading(false)
    }
  }

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
            <div>
              <p className="text-muted-foreground">다운로드</p>
              <p className="font-medium">{product.download_count}회</p>
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
            {canDownload ? (
              <button
                onClick={() => handleDownload()}
                disabled={downloading}
                className="flex-1 h-12 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {downloading ? '다운로드 중...' : '다운로드'}
              </button>
            ) : !isLoggedIn && product.is_free ? (
              <Link
                href="/auth/login"
                className="flex-1 h-12 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-colors bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Download className="w-4 h-4" />
                로그인 후 무료 다운로드
              </Link>
            ) : (
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
                  <><ShoppingCart className="w-4 h-4" /> 구매하기</>}
              </button>
            )}
            <button className="h-12 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>

          {/* Product Files List */}
          {canDownload && productFiles.length > 1 && (
            <div className="border border-border rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-semibold mb-3">첨부 파일</h3>
              {productFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{file.file_name}</span>
                    {file.file_size && <span className="text-xs text-muted-foreground shrink-0">({file.file_size})</span>}
                  </div>
                  <button
                    onClick={() => handleDownload(file.file_url, file.file_name)}
                    disabled={downloading}
                    className="text-xs px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors shrink-0 ml-2"
                  >
                    다운로드
                  </button>
                </div>
              ))}
            </div>
          )}

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
            <ProductReviews productId={product.id} />
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold mb-6">관련 템플릿</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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
