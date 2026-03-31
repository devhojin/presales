'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { type Product, formatPrice } from '@/lib/data'
import { useCartStore } from '@/stores/cart-store'
import { ShoppingCart, Check } from 'lucide-react'

export function ProductCard({ product }: { product: Product }) {
  const discount = Math.round((1 - product.price / product.originalPrice) * 100)
  const { toggleItem, isInCart } = useCartStore()
  const inCart = isInCart(product.id)

  const handleCartToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    toggleItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      originalPrice: product.originalPrice,
      thumbnail: product.thumbnail,
      format: product.format,
    })
  }

  return (
    <Link href={`/store/${product.id}`} className="group">
      <div className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={product.thumbnail}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <Badge className={`absolute top-3 left-3 border text-xs ${product.price === 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
            {product.price === 0 ? '무료' : '유료'}
          </Badge>
          {discount > 0 && (
            <Badge className="absolute top-3 right-3 bg-red-500 text-white border-0 text-xs">
              -{discount}%
            </Badge>
          )}
          <button
            onClick={handleCartToggle}
            className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
              inCart
                ? 'bg-primary text-primary-foreground'
                : 'bg-white/90 text-gray-600 hover:bg-white hover:text-primary'
            }`}
          >
            {inCart ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
          </button>
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
