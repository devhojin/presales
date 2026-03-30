import { notFound } from 'next/navigation'
import Link from 'next/link'
import { products, formatPrice, allTiers } from '@/lib/data'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { FileText, Download, ShoppingCart, Heart, ArrowLeft } from 'lucide-react'

export function generateStaticParams() {
  return products.map((p) => ({ id: String(p.id) }))
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = products.find((p) => p.id === Number(id))

  if (!product) return notFound()

  const tierInfo = allTiers.find((t) => t.id === product.tier)
  const discount = Math.round((1 - product.price / product.originalPrice) * 100)
  const related = products.filter((p) => p.id !== product.id && p.category === product.category).slice(0, 3)

  return (
    <div className="container mx-auto px-4 py-10">
      <Link
        href="/store"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> 스토어로 돌아가기
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover"
          />
          {tierInfo && (
            <Badge className={`absolute top-4 left-4 ${tierInfo.color} border`}>
              {tierInfo.label}
            </Badge>
          )}
        </div>

        {/* Info */}
        <div className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{product.vendor}</p>
            <h1 className="text-2xl font-bold">{product.title}</h1>
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatPrice(product.price)}</span>
            <span className="text-lg text-muted-foreground line-through">{formatPrice(product.originalPrice)}</span>
            {discount > 0 && (
              <Badge className="bg-red-500 text-white border-0">-{discount}%</Badge>
            )}
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">파일 형식</p>
              <p className="font-medium">{product.format}</p>
            </div>
            <div>
              <p className="text-muted-foreground">페이지 수</p>
              <p className="font-medium">{product.pages}p</p>
            </div>
            <div>
              <p className="text-muted-foreground">파일 크기</p>
              <p className="font-medium">{product.size}</p>
            </div>
            <div>
              <p className="text-muted-foreground">카테고리</p>
              <p className="font-medium">{product.category}</p>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-2">상품 설명</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>

          <div className="flex gap-3">
            <button className="flex-1 h-12 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              바로 구매하기
            </button>
            <button className="h-12 px-4 rounded-lg border border-border hover:bg-muted transition-colors flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="text-xl font-bold mb-6">관련 템플릿</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map((p) => (
              <Link key={p.id} href={`/store/${p.id}`} className="group">
                <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all">
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2">{p.title}</h3>
                    <p className="text-primary font-bold mt-2">{formatPrice(p.price)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
