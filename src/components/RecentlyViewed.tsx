'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronDown, ChevronUp, Clock, FileText, X } from 'lucide-react'
import { formatPrice } from '@/lib/types'

const STORAGE_KEY = 'presales-recently-viewed'
const MAX_DISPLAY = 3

interface RecentItem {
  id: number
  title: string
  thumbnail_url: string | null
  price: number
  viewedAt: number
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentItem[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentItem[]
    return stored.slice(0, MAX_DISPLAY)
  })
  const [collapsed, setCollapsed] = useState(false)

  const removeItem = (id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentItem[]
    const next = stored.filter((it) => it.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setItems(next.slice(0, MAX_DISPLAY))
  }

  if (items.length === 0) return null

  return (
    <div className="hidden xl:block fixed right-[50px] bottom-10 z-30 origin-bottom-right scale-[0.7]">

      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="w-[220px] bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
          title="최근 본 상품 펼치기"
          aria-label="최근 본 상품 펼치기"
        >
          <div className="flex items-center justify-between px-3.5 py-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">최근 본 상품</span>
            </div>
            <ChevronUp className="w-3.5 h-3.5 text-slate-700" />
          </div>
        </button>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.12)] w-[220px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-700" />
              <span className="text-xs font-bold text-slate-900">최근 본 상품</span>
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 rounded flex items-center justify-center hover:bg-slate-200 transition-colors cursor-pointer"
              aria-label="최근 본 상품 접기"
              title="최근 본 상품 접기"
            >
              <ChevronDown className="w-3.5 h-3.5 text-slate-700" />
            </button>
          </div>

          {/* Items */}
          <div className="px-2.5 py-2.5 space-y-3">
            {items.map(item => (
              <div key={item.id} className="relative group">
                <Link href={`/store/${item.id}`} className="block">
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
                {/* 개별 삭제 버튼 (썸네일 우상단) */}
                <button
                  type="button"
                  onClick={(e) => removeItem(item.id, e)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-white/90 backdrop-blur border border-slate-200 shadow-sm flex items-center justify-center text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                  aria-label={`${item.title} 제거`}
                  title="이 상품 제거"
                >
                  <X className="w-3 h-3" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
