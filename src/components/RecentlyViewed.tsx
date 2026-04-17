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
    <div className="hidden xl:block fixed right-[50px] bottom-10 z-30">

      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="bg-white border border-slate-200 rounded-xl px-2.5 py-3.5 shadow-lg hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer flex flex-col items-center gap-1"
          title="최근 본 상품 열기"
        >
          <Clock className="w-4 h-4 text-slate-700" />
          <span className="text-xs text-slate-900 font-bold">{items.length}</span>
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] w-[220px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">최근 본 상품</span>
            </div>
            <button onClick={() => setCollapsed(true)} className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer" aria-label="닫기">
              <X className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>

          {/* Items */}
          <div className="px-2.5 py-2.5 space-y-3">
            {items.map(item => (
              <Link key={item.id} href={`/store/${item.id}`} className="block group">
                <div className="aspect-[4/3] rounded-lg overflow-hidden bg-slate-100 mb-1.5 border border-slate-200">
                  {item.thumbnail_url ? (
                    <Image src={item.thumbnail_url} alt={item.title} width={160} height={120} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-slate-400" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug group-hover:text-primary transition-colors">{item.title}</p>
                <p className="text-xs text-primary font-bold mt-0.5">{formatPrice(item.price)}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
