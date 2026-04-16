'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import {
  Search, MessageCircle, Loader2, HelpCircle,
  ShoppingCart, Download, FileText, CreditCard, RefreshCw, Headphones,
} from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'
import { createClient } from '@/lib/supabase'
import { useChatWidgetStore } from '@/stores/chat-store'

interface FaqItem {
  id: number
  question: string
  answer: string
  sort_order: number
}

interface FaqCategory {
  id: number
  name: string
  icon: string
  sort_order: number
  faqs: FaqItem[]
}

const ICON_MAP: Record<string, typeof HelpCircle> = {
  'ShoppingCart': ShoppingCart, 'Download': Download, 'FileText': FileText,
  'CreditCard': CreditCard, 'RefreshCw': RefreshCw, 'Headphones': Headphones,
  'MessageCircle': MessageCircle, 'HelpCircle': HelpCircle,
}

function getCategoryIcon(iconName: string) { return ICON_MAP[iconName] || HelpCircle }

const COLORS = [
  'bg-blue-50 text-blue-600', 'bg-blue-50 text-blue-700', 'bg-orange-50 text-orange-600',
  'bg-purple-50 text-purple-600', 'bg-pink-50 text-pink-600', 'bg-cyan-50 text-cyan-600',
]

export function FaqClient() {
  const { open: openChat } = useChatWidgetStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchFaqs() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('faq_categories')
        .select('id, name, icon, sort_order, faqs (id, question, answer, sort_order)')
        .order('sort_order')
        .order('sort_order', { referencedTable: 'faqs' })
      if (!error && data) setCategories(data as FaqCategory[])
      setLoading(false)
    }
    fetchFaqs()
  }, [])

  // Search + category filter
  const filteredData = useMemo(() => {
    let data = categories
    // Category filter
    if (selectedCategoryId) data = data.filter(c => c.id === selectedCategoryId)
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      data = data
        .map(section => ({ ...section, faqs: section.faqs.filter(item => item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)) }))
        .filter(section => section.faqs.length > 0)
    }
    return data
  }, [searchQuery, categories, selectedCategoryId])

  const totalFaqs = categories.reduce((sum, s) => sum + s.faqs.length, 0)
  const totalMatches = filteredData.reduce((sum, s) => sum + s.faqs.length, 0)

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Header */}
      <div className="py-8 md:py-12">
        <div className="flex items-center gap-3 mb-3">
          <HelpCircle className="w-7 h-7 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">고객지원</h1>
        </div>
        <p className="text-muted-foreground mb-6">
          무엇을 도와드릴까요? <span className="text-foreground font-medium">{totalFaqs}개</span>의 자주 묻는 질문을 확인하세요
        </p>

        {/* Search */}
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="키워드로 검색 (예: 환불, 다운로드, 결제...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {searchQuery && (
          <p className="mt-3 text-sm text-muted-foreground">
            &ldquo;{searchQuery}&rdquo; 검색 결과: <strong className="text-foreground">{totalMatches}</strong>개
          </p>
        )}
      </div>

      {/* 2-column: Left sidebar + Right content */}
      <div className="flex gap-8 pb-16">
        {/* Left sidebar — category nav (desktop) */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            <button
              onClick={() => setSelectedCategoryId(null)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer border-l-2 ${
                !selectedCategoryId
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              전체 질문
            </button>
            {categories.map((cat) => {
              const isActive = selectedCategoryId === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(isActive ? null : cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all cursor-pointer border-l-2 ${
                    isActive
                      ? 'border-primary text-primary font-semibold bg-primary/5'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Mobile category pills */}
        <div className="md:hidden flex flex-wrap gap-2 mb-6 w-full">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
              !selectedCategoryId ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
                selectedCategoryId === cat.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border/50 text-muted-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Right content */}
        <div className="flex-1 min-w-0">
          {filteredData.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">검색 결과가 없습니다</p>
              <p className="text-sm text-muted-foreground">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredData.map((section, idx) => (
                <div key={section.id}>
                  <div className="flex items-center gap-2.5 mb-3">
                    {(() => { const Icon = getCategoryIcon(section.icon); return <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${COLORS[idx % COLORS.length]}`}><Icon className="w-3.5 h-3.5" /></div> })()}
                    <h2 className="text-sm font-bold tracking-tight">{section.name}</h2>
                    <span className="text-xs text-muted-foreground">({section.faqs.length})</span>
                  </div>
                  <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                    <Accordion>
                      {section.faqs.map((item) => (
                        <AccordionItem key={item.id} value={`faq-${item.id}`}>
                          <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                            {item.answer}
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-zinc-900 p-8 md:p-10 text-center text-white">
            <MessageCircle className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold tracking-tight mb-2">원하는 답변을 찾지 못하셨나요?</h3>
            <p className="text-sm text-zinc-400 mb-6">전문 컨설턴트가 직접 도와드립니다</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={openChat}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-full text-sm font-medium transition-all active:scale-[0.98] cursor-pointer border border-white/20"
              >
                <MessageCircle className="w-4 h-4" /> 채팅 문의하기
              </button>
              <Link href="/consulting" className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-full text-sm font-medium transition-all active:scale-[0.98] cursor-pointer">
                <Headphones className="w-4 h-4" /> 컨설팅 문의하기
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
