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

// Category icon mapping
const ICON_MAP: Record<string, typeof HelpCircle> = {
  'ShoppingCart': ShoppingCart,
  'Download': Download,
  'FileText': FileText,
  'CreditCard': CreditCard,
  'RefreshCw': RefreshCw,
  'Headphones': Headphones,
  'MessageCircle': MessageCircle,
  'HelpCircle': HelpCircle,
}

function getCategoryIcon(iconName: string) {
  return ICON_MAP[iconName] || HelpCircle
}

// Category color mapping
const COLORS = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-orange-50 text-orange-600',
  'bg-purple-50 text-purple-600',
  'bg-pink-50 text-pink-600',
  'bg-cyan-50 text-cyan-600',
  'bg-amber-50 text-amber-600',
  'bg-indigo-50 text-indigo-600',
]

export function FaqClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  useEffect(() => {
    async function fetchFaqs() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('faq_categories')
        .select(`
          id, name, icon, sort_order,
          faqs (id, question, answer, sort_order)
        `)
        .order('sort_order')
        .order('sort_order', { referencedTable: 'faqs' })

      if (!error && data) {
        setCategories(data as FaqCategory[])
      }
      setLoading(false)
    }
    fetchFaqs()
  }, [])

  // Search filter
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return categories
    const q = searchQuery.toLowerCase()
    return categories
      .map((section) => ({
        ...section,
        faqs: section.faqs.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.faqs.length > 0)
  }, [searchQuery, categories])

  const totalMatches = filteredData.reduce((sum, s) => sum + s.faqs.length, 0)
  const totalFaqs = categories.reduce((sum, s) => sum + s.faqs.length, 0)

  // Selected category data
  const selectedCategory = selectedCategoryId
    ? filteredData.find(c => c.id === selectedCategoryId)
    : null

  // Popular questions (first 2 from each category, max 6)
  const popularQuestions = useMemo(() => {
    const result: Array<FaqItem & { categoryName: string }> = []
    for (const cat of categories) {
      for (const faq of cat.faqs.slice(0, 2)) {
        result.push({ ...faq, categoryName: cat.name })
        if (result.length >= 6) break
      }
      if (result.length >= 6) break
    }
    return result
  }, [categories])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
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
            onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategoryId(null) }}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-border/50 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>

        {searchQuery && (
          <p className="mt-3 text-sm text-muted-foreground">
            &ldquo;{searchQuery}&rdquo; 검색 결과: <strong className="text-foreground">{totalMatches}</strong>개
          </p>
        )}
      </div>

      {/* Search results mode */}
      {searchQuery ? (
        <div className="pb-12">
          {filteredData.length === 0 ? (
            <div className="text-center py-16">
              <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">검색 결과가 없습니다</p>
              <p className="text-sm text-muted-foreground">다른 키워드로 검색해보세요</p>
            </div>
          ) : (
            <div className="max-w-3xl space-y-8">
              {filteredData.map((section) => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">{section.name}</h3>
                  <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                    <Accordion>
                      {section.faqs.map((item) => (
                        <AccordionItem key={item.id} value={`faq-${item.id}`}>
                          <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline text-left">
                            {item.question}
                          </AccordionTrigger>
                          <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
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
        </div>
      ) : selectedCategory ? (
        /* Category detail mode */
        <div className="pb-12">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="text-sm text-muted-foreground hover:text-foreground mb-6 cursor-pointer flex items-center gap-1"
          >
            ← 전체 카테고리
          </button>
          <div className="flex items-center gap-3 mb-6">
            {(() => { const Icon = getCategoryIcon(selectedCategory.icon); return <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${COLORS[categories.indexOf(selectedCategory) % COLORS.length]}`}><Icon className="w-5 h-5" /></div> })()}
            <div>
              <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
              <p className="text-xs text-muted-foreground">{selectedCategory.faqs.length}개 질문</p>
            </div>
          </div>
          <div className="max-w-3xl border border-border/50 rounded-2xl overflow-hidden bg-card">
            <Accordion>
              {selectedCategory.faqs.map((item) => (
                <AccordionItem key={item.id} value={`faq-${item.id}`}>
                  <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      ) : (
        /* Default: Category cards + Popular questions */
        <div className="pb-12 space-y-12">
          {/* Category Cards Grid */}
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">카테고리</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat, idx) => {
                const Icon = getCategoryIcon(cat.icon)
                const color = COLORS[idx % COLORS.length]
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="group bg-card border border-border/50 rounded-2xl p-5 text-left hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{cat.faqs.length}개 질문</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Popular Questions */}
          {popularQuestions.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">자주 찾는 질문</h2>
              <div className="max-w-3xl border border-border/50 rounded-2xl overflow-hidden bg-card">
                <Accordion>
                  {popularQuestions.map((item) => (
                    <AccordionItem key={item.id} value={`pop-${item.id}`}>
                      <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold shrink-0">{item.categoryName}</span>
                          <span>{item.question}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="rounded-2xl bg-zinc-900 p-8 md:p-10 text-center text-white">
            <MessageCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold tracking-tight mb-2">원하는 답변을 찾지 못하셨나요?</h3>
            <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
              전문 컨설턴트가 직접 도와드립니다
            </p>
            <Link
              href="/consulting"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-full text-sm font-medium transition-all active:scale-[0.98] cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              컨설팅 문의하기
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
