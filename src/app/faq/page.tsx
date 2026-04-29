import type { Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { FaqClient } from './FaqClient'
import { SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'

export const metadata: Metadata = {
  title: '자주 묻는 질문 (FAQ) | 프리세일즈',
  description:
    '구매/결제, 다운로드, 상품, 컨설팅, 환불 등 프리세일즈 이용에 관한 자주 묻는 질문을 확인하세요.',
  alternates: {
    canonical: `${SITE_URL}/faq`,
  },
  openGraph: {
    title: '자주 묻는 질문 (FAQ) | 프리세일즈',
    description: '구매/결제, 다운로드, 상품, 컨설팅, 환불 등 자주 묻는 질문',
    url: `${SITE_URL}/faq`,
    images: [{ url: '/images/hero-consultant-2.webp', width: 1200, height: 630, alt: '프리세일즈 고객지원' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '자주 묻는 질문 (FAQ) | 프리세일즈',
    description: '구매/결제, 다운로드, 상품, 컨설팅, 환불 등 자주 묻는 질문',
    images: ['/images/hero-consultant-2.webp'],
  },
}

type FaqRow = {
  question: string
  answer: string
  is_active: boolean
  sort_order: number
}

type FaqCategoryRow = {
  faqs: FaqRow[] | null
}

async function getFaqJsonLd() {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return [] } } },
    )

    const { data } = await supabase
      .from('faq_categories')
      .select('faqs (question, answer, is_active, sort_order)')
      .eq('is_active', true)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'faqs' })

    const faqs = ((data ?? []) as FaqCategoryRow[])
      .flatMap((category) => category.faqs ?? [])
      .filter((item) => item.is_active && item.question && item.answer)

    if (faqs.length === 0) return null

    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    }
  } catch {
    return null
  }
}

export default async function FaqPage() {
  const faqJsonLd = await getFaqJsonLd()

  return (
    <>
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(faqJsonLd) }}
        />
      )}
      <FaqClient />
    </>
  )
}
