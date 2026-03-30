import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'
import { type Product, formatPrice, allTiers } from '@/lib/data'

export function ProductCard({ product }: { product: Product }) {
  const tierInfo = allTiers.find((t) => t.id === product.tier)
  const discount = Math.round((1 - product.price / product.originalPrice) * 100)

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          {tierInfo && (
            <Badge className={`absolute top-3 left-3 ${tierInfo.color} border text-xs`}>
              {tierInfo.label}
            </Badge>
          )}
          {discount > 0 && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs">
              -{discount}%
            </Badge>
          )}
        </div>
        <div className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">{product.vendor}</p>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            <span className="text-xs text-muted-foreground line-through">
              {formatPrice(product.originalPrice)}
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {product.format}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {product.pages}p
            </Badge>
          </div>
        </div>
      </div>
    </Link>
  )
}
