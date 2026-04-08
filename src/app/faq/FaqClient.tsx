'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Search, MessageCircle, Loader2 } from 'lucide-react'
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/60 to-background border-b border-border py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">자주 묻는 질문</h1>
          <p className="text-muted-foreground text-lg mb-8">
            궁금하신 점을 빠르게 찾아보세요
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="키워드로 검색 (예: 환불, 다운로드, 결제...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          {searchQuery && (
            <p className="mt-3 text-sm text-muted-foreground">
              &ldquo;{searchQuery}&rdquo; 검색 결과: {totalMatches}개
            </p>
          )}
        </div>
      </section>

      {/* FAQ Content */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        {filteredData.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground">다른 키워드로 검색하거나 아래 문의하기를 이용해 주세요.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredData.map((section) => (
              <div key={section.id}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  {section.name}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({section.faqs.length})
                  </span>
                </h2>
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <Accordion>
                    {section.faqs.map((item) => (
                      <AccordionItem key={item.id} value={`faq-${item.id}`}>
                        <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline">
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

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-primary/5 border border-primary/10 p-8 text-center">
          <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">원하는 답변을 찾지 못하셨나요?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            전문 컨설턴트가 직접 도와드립니다. 문의 후 영업일 기준 1일 이내 답변드립니다.
          </p>
          <Link
            href="/consulting"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            컨설팅 문의하기
          </Link>
        </div>
      </section>
    </div>
  )
}
