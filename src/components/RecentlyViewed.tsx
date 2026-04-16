'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, FileText, X } from 'lucide-react'
import { formatPrice } from '@/lib/types'

const STORAGE_KEY = 'presales-recently-viewed'
const MAX_DISPLAY = 5

interface RecentItem {
  id: number
  title: string
  thumbnail_url: string | null
  price: number
  viewedAt: number
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>([])
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentItem[]
    setItems(stored.slice(0, MAX_DISPLAY))
  }, [])

  if (items.length === 0) return null

  return (
    <div className="hidden xl:block fixed right-[50px] top-1/2 -translate-y-1/2 z-30 animate-[float_4s_ease-in-out_infinite]"
      style={{ animation: 'float 4s ease-in-out infinite' }}>
      <style>{`@keyframes float { 0%,100%{transform:translateY(-50%)} 50%{transform:translateY(calc(-50% - 10px))} }`}</style>
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="bg-card border border-border/50 rounded-xl px-2 py-3 shadow-lg hover:bg-muted transition-colors cursor-pointer"
          title="최근 본 상품 열기"
        >
          <Clock className="w-4 h-4 text-muted-foreground mb-1" />
          <span className="text-[10px] text-muted-foreground font-medium writing-vertical">{items.length}</span>
        </button>
      ) : (
        <div className="bg-card border border-border/50 rounded-2xl shadow-xl w-[180px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/30">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="text-[11px] font-semibold text-muted-foreground">최근 본</span>
            </div>
            <button onClick={() => setCollapsed(true)} className="w-5 h-5 rounded flex items-center justify-center hover:bg-muted transition-colors cursor-pointer">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>

          {/* Items */}
          <div className="px-2 py-2 space-y-2">
            {items.map(item => (
              <Link key={item.id} href={`/store/${item.id}`} className="block group">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted mb-1">
                  {item.thumbnail_url ? (
                    <Image src={item.thumbnail_url} alt={item.title} width={120} height={90} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-medium line-clamp-2 leading-tight group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-[10px] text-primary font-semibold">{formatPrice(item.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
