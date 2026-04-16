'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, FileText } from 'lucide-react'
import { formatPrice } from '@/lib/types'

const STORAGE_KEY = 'presales-recently-viewed'

interface RecentItem {
  id: number
  title: string
  thumbnail_url: string | null
  price: number
  viewedAt: number
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([])

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentItem[]
    setItems(stored)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="py-6">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground">최근 본 상품</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map(item => (
          <Link key={item.id} href={`/store/${item.id}`} className="shrink-0 w-36 group">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-2">
              {item.thumbnail_url ? (
                <Image src={item.thumbnail_url} alt={item.title} width={160} height={120} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
            <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
            <p className="text-xs text-primary font-semibold mt-0.5">{formatPrice(item.price)}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
