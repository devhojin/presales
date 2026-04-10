'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, MessageCircle, Loader2, HelpCircle } from 'lucide-react'
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

export function FaqClient() {
  const [searchQuery, setSearchQuery] = useState('')
  const [categories, setCategories] = useState<FaqCategory[]>([])
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="py-8 md:py-12">
          <div className="flex items-center gap-3 mb-3">
            <HelpCircle className="w-7 h-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">자주 묻는 질문</h1>
          </div>
          <p className="text-muted-foreground mb-6">궁금하신 점을 빠르게 찾아보세요</p>

          {/* Search */}
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                &ldquo;{searchQuery}&rdquo; 검색 결과: {totalMatches}개
              </p>
            )}
        </div>
      </div>

      {/* FAQ Content */}
      <section className="max-w-[800px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {filteredData.length === 0 ? (
          <div className="text-center py-24">
            <HelpCircle className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-semibold text-foreground tracking-tight mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground">다른 키워드로 검색하거나 아래 문의하기를 이용해 주세요.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {filteredData.map((section) => (
              <div key={section.id}>
                <h2 className="text-base font-bold mb-4 flex items-center gap-2.5 tracking-tight">
                  <HelpCircle className="w-4.5 h-4.5 text-primary" />
                  {section.name}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({section.faqs.length})
                  </span>
                </h2>
                <div className="border border-border/50 rounded-2xl overflow-hidden bg-card">
                  <Accordion>
                    {section.faqs.map((item) => (
                      <AccordionItem key={item.id} value={`faq-${item.id}`}>
                        <AccordionTrigger className="px-6 py-4.5 text-sm font-medium hover:no-underline">
                          {item.question}
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
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
        <div className="mt-20 rounded-2xl bg-[#0C1220] p-8 md:p-10 text-center text-white">
          <MessageCircle className="w-10 h-10 text-emerald-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold tracking-tight mb-2">원하는 답변을 찾지 못하셨나요?</h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            전문 컨설턴트가 직접 도와드립니다. 문의 후 영업일 기준 1일 이내 답변드립니다.
          </p>
          <Link
            href="/consulting"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white px-6 py-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-[0.98]"
          >
            <MessageCircle className="w-4 h-4" />
            컨설팅 문의하기
          </Link>
        </div>
      </section>
    </div>
  )
}
