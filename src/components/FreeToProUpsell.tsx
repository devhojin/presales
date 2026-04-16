'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, FileText, X, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { type DbProduct, formatPrice } from '@/lib/types'

interface Props {
  productId: number
  categoryId: number | null
  isOpen: boolean
  onClose: () => void
}

export function FreeToProUpsell({ productId, categoryId, isOpen, onClose }: Props) {
  const [paidProducts, setPaidProducts] = useState<DbProduct[]>([])

  useEffect(() => {
    if (!isOpen || !categoryId) return
    const supabase = createClient()
    supabase
      .from('products')
      .select('*')
      .eq('is_published', true)
      .eq('is_free', false)
      .contains('category_ids', [categoryId])
      .neq('id', productId)
      .order('download_count', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length > 0) setPaidProducts(data)
      })
  }, [isOpen, categoryId, productId])

  if (!isOpen || paidProducts.length === 0) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg mx-0 sm:mx-4 p-6 animate-in slide-in-from-bottom-4 duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold">유료 버전도 확인해보세요</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-5">무료 템플릿이 도움이 되셨다면, 실제 낙찰된 유료 버전으로 완성도를 높여보세요.</p>

        <div className="space-y-3 mb-5">
          {paidProducts.map(p => (
            <Link key={p.id} href={`/store/${p.id}`} onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 hover:shadow-sm transition-all group">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                {p.thumbnail_url ? (
                  <Image src={p.thumbnail_url} alt={p.title} width={56} height={56} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><FileText className="w-5 h-5 text-muted-foreground" /></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">{p.title}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(p.price)}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>

        <Link href="/store?price=paid" onClick={onClose} className="block w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 cursor-pointer">
          모든 유료 템플릿 보기 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
