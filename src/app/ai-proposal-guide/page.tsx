import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Bot, FileText, Image as ImageIcon, ListChecks, PenLine, Search } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import {
  AI_PROPOSAL_GUIDE_BASE_PATH,
  AI_PROPOSAL_GUIDE_DESCRIPTION,
  AI_PROPOSAL_GUIDE_KEYWORDS,
  AI_PROPOSAL_GUIDE_OG_IMAGE,
  AI_PROPOSAL_GUIDE_PUBLISHED_AT,
  AI_PROPOSAL_GUIDE_TITLE,
  aiProposalGuideIndexUrl,
  aiProposalGuideUrl,
  getAiProposalGuideCategoriesWithArticles,
  getAiProposalGuideImageUrl,
  getAiProposalGuideSeoDescription,
  getAiProposalGuideSeoKeywords,
  type AiProposalGuideStep,
} from '@/lib/ai-proposal-guide'
import { getPublishedAiProposalGuideServerContent } from '@/lib/ai-proposal-guide-server'
import { EditorialArticleLink, GuideCover, GuideCoverLink } from '@/components/ai-proposal-guide/GuideCover'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${AI_PROPOSAL_GUIDE_TITLE} | ${SITE_NAME}`,
  description: AI_PROPOSAL_GUIDE_DESCRIPTION,
  alternates: { canonical: aiProposalGuideIndexUrl() },
  keywords: AI_PROPOSAL_GUIDE_KEYWORDS,
  category: 'business',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: `${AI_PROPOSAL_GUIDE_TITLE} | ${SITE_NAME}`,
    description: AI_PROPOSAL_GUIDE_DESCRIPTION,
    url: aiProposalGuideIndexUrl(),
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: AI_PROPOSAL_GUIDE_OG_IMAGE, width: 2400, height: 1309, alt: AI_PROPOSAL_GUIDE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${AI_PROPOSAL_GUIDE_TITLE} | ${SITE_NAME}`,
    description: AI_PROPOSAL_GUIDE_DESCRIPTION,
    images: [AI_PROPOSAL_GUIDE_OG_IMAGE],
  },
}

const workflow = [
  { title: '공고를 읽기 전에', body: '사전규격, 본공고, 마감, 참가자격을 먼저 분리합니다.', icon: Search },
  { title: 'AI로 초벌 구조화', body: 'AI로 요구사항, 평가항목, 리스크를 빠르게 분류합니다.', icon: Bot },
  { title: '사람이 검수', body: '참가자격, 실적, 가격서, 제출 조건은 원문 기준으로 다시 확인합니다.', icon: ListChecks },
  { title: '문서로 완성', body: '이미지, 본문, PDF, 나라장터 제출 확인까지 하나의 흐름으로 묶습니다.', icon: FileText },
]

function getFeaturedGuides(articles: AiProposalGuideStep[]) {
  return {
    hero: articles[0],
    shelf: articles.slice(0, 6),
    secondary: articles.slice(4, 8),
  }
}

export default async function AiProposalGuideIndexPage() {
  const content = await getPublishedAiProposalGuideServerContent()
  const sections = getAiProposalGuideCategoriesWithArticles(content)
  const articles = content.articles
  const { hero, shelf, secondary } = getFeaturedGuides(articles)
  const topicLinks = articles.map((guide) => ({
    href: aiProposalGuideUrl(guide.slug).replace(SITE_URL, ''),
    title: guide.primaryKeyword,
    description: guide.shortTitle,
  }))

  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: AI_PROPOSAL_GUIDE_TITLE,
    description: metadata.description,
    url: aiProposalGuideIndexUrl(),
    inLanguage: 'ko-KR',
    image: getAiProposalGuideImageUrl(),
    keywords: AI_PROPOSAL_GUIDE_KEYWORDS,
    about: AI_PROPOSAL_GUIDE_KEYWORDS.map((keyword) => ({
      '@type': 'Thing',
      name: keyword,
    })),
    datePublished: AI_PROPOSAL_GUIDE_PUBLISHED_AT,
    dateModified: content.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: articles.map((guide) => ({
        '@type': 'ListItem',
        position: guide.sortOrder,
        item: {
          '@type': 'Article',
          headline: guide.title,
          description: getAiProposalGuideSeoDescription(guide),
          url: aiProposalGuideUrl(guide.slug),
          image: getAiProposalGuideImageUrl(guide),
          keywords: getAiProposalGuideSeoKeywords(guide),
        },
      })),
    },
    hasPart: articles.map((guide) => ({
      '@type': 'Article',
      headline: guide.title,
      description: getAiProposalGuideSeoDescription(guide),
      url: aiProposalGuideUrl(guide.slug),
      image: getAiProposalGuideImageUrl(guide),
      position: guide.sortOrder,
    })),
  })
  const breadcrumbJsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: SITE_NAME,
        item: SITE_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: AI_PROPOSAL_GUIDE_TITLE,
        item: aiProposalGuideIndexUrl(),
      },
    ],
  })

  return (
    <main className="overflow-x-hidden bg-[#F6F5F1] text-zinc-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <section className="relative isolate overflow-hidden bg-[#111A20] text-white">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('/images/ai-proposal-guide/hero-gemini-background.webp')] bg-cover bg-[center_44%]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,17,22,0.96)_0%,rgba(16,24,30,0.86)_43%,rgba(16,24,30,0.22)_74%,rgba(11,17,22,0.42)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,14,0.18),rgba(6,10,14,0.04)_48%,rgba(6,10,14,0.32))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_38%,rgba(96,165,250,0.2),transparent_34%)]" />
        </div>
        <div className="mx-auto grid min-h-[520px] max-w-[1180px] gap-10 px-4 py-16 md:grid-cols-[1fr_360px] md:px-8 md:py-20">
          <div className="flex min-w-0 flex-col justify-center">
            <p className="mb-6 text-xs font-semibold tracking-[0.24em] text-white/76">PRESALES ORIGINAL</p>
            <h1 className="max-w-2xl break-words text-4xl font-semibold leading-tight md:text-6xl">
              AI 제안서 작성법
            </h1>
            <p className="mt-6 max-w-[22rem] break-words text-sm leading-7 text-white/82 sm:max-w-xl sm:text-base sm:leading-8">
              각자 쓰는 AI 도구를 보조자로 두고 RFP 분석부터 나라장터 제출 확인까지 따라가는 실무 콘텐츠 허브입니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero && (
                <Link
                  href={`${AI_PROPOSAL_GUIDE_BASE_PATH}/${hero.slug}`}
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-blue-50"
                >
                  대표 글 읽기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
              <Link
                href="/consulting"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/30 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                제안서 컨설팅
              </Link>
            </div>
          </div>
          {hero && (
            <div className="mx-auto w-full max-w-[280px] self-center sm:max-w-[300px] md:max-w-none">
              <GuideCover guide={hero} priority />
            </div>
          )}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-12 md:px-8">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">SERIES SHELF</p>
              <h2 className="mt-2 text-2xl font-bold">먼저 읽을 콘텐츠</h2>
            </div>
            <p className="hidden text-sm text-slate-500 md:block">전체 {articles.length}편</p>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6">
            {shelf.map((guide) => (
              <GuideCoverLink key={guide.slug} guide={guide} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#34404A] text-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-16 md:grid-cols-[1fr_1.3fr] md:px-8">
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-blue-200">WORKFLOW</p>
            <h2 className="mt-4 max-w-md break-words text-3xl font-semibold leading-tight md:text-4xl">
              제안서 작성은 글쓰기보다 먼저 구조화입니다
            </h2>
            <p className="mt-5 max-w-md break-words text-sm leading-7 text-white/74">
              각 콘텐츠는 AI가 할 일과 사람이 최종 판단할 일을 분리합니다. 빠르게 만들되, 원문 근거와 제출 조건은 놓치지 않게 설계했습니다.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item) => {
              const Icon = item.icon
              return (
                <article key={item.title} className="min-w-0 border border-white/14 bg-white/7 p-5">
                  <Icon className="h-5 w-5 text-blue-200" />
                  <h3 className="mt-4 break-words text-base font-bold">{item.title}</h3>
                  <p className="mt-2 break-words text-sm leading-6 text-white/72">{item.body}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-16 md:px-8 md:py-20">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-blue-700">CONTENT LIBRARY</p>
          <h2 className="mt-3 break-words text-3xl font-bold md:text-4xl">카테고리별 제안 실무</h2>
          <p className="mx-auto mt-4 max-w-2xl break-words text-sm leading-7 text-slate-600">
            새 글과 새 카테고리는 관리자에서 추가할 수 있고, 공개된 글은 RSS와 sitemap에 자동으로 반영됩니다.
          </p>
        </div>

        <div className="space-y-14">
          {sections.map(({ category, articles: categoryArticles }) => (
            <section key={category.slug} className="grid gap-8 lg:grid-cols-[260px_1fr]">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-slate-500">{category.eyebrow}</p>
                <h3 className="mt-2 break-words text-2xl font-bold">{category.title}</h3>
                <p className="mt-3 break-words text-sm leading-7 text-slate-600">{category.description}</p>
              </div>
              <div className="grid gap-x-8 md:grid-cols-2">
                {categoryArticles.map((guide) => (
                  <EditorialArticleLink key={guide.slug} guide={guide} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-6 px-4 py-14 md:grid-cols-3 md:px-8">
          {[
            { icon: Bot, title: 'AI 초벌 분석', body: 'RFP 요약, 요구사항 추출, 질의 후보, 본문 초안, 발표 예상 질문을 만드는 보조자로 사용합니다.' },
            { icon: ImageIcon, title: 'AI 이미지 시안', body: '표지와 개념도 방향을 빠르게 실험하고, 최종 텍스트와 구조는 제안서 문서에서 다시 검수합니다.' },
            { icon: ListChecks, title: '반복 자료 정리', body: '요구사항 표, 제출 파일 목록, 검수 체크리스트, 반복 문서 정리를 AI로 구조화합니다.' },
          ].map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="min-w-0 border border-slate-200 p-6">
                <Icon className="h-6 w-6 text-blue-700" />
                <h2 className="mt-4 break-words text-lg font-bold text-zinc-950">{item.title}</h2>
                <p className="mt-3 break-words text-sm leading-7 text-slate-600">{item.body}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-14 md:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.2em] text-blue-700">SEARCH TOPICS</p>
            <h2 className="mt-3 break-words text-2xl font-bold md:text-3xl">AI 제안서 작성 주제별 바로가기</h2>
            <p className="mt-4 break-words text-sm leading-7 text-slate-600">
              검색 의도가 분명한 주제는 별도 글로 연결했습니다. RFP 분석, 요구사항 대응표, 제안서 검수처럼 실무자가 바로 찾는 문제부터 읽을 수 있습니다.
            </p>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topicLinks.map((topic) => (
              <Link
                key={topic.href}
                href={topic.href}
                className="group min-w-0 border border-slate-200 bg-[#F8FAFC] p-4 transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="break-words text-sm font-bold text-zinc-950 group-hover:text-blue-800">{topic.title}</span>
                <span className="mt-1 block break-words text-xs leading-5 text-slate-500">{topic.description}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {secondary.length > 0 && (
        <section className="bg-[#F0EFE9]">
          <div className="mx-auto max-w-[1180px] px-4 py-14 md:px-8">
            <div className="mb-7 flex items-center gap-2">
              <PenLine className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-bold">이어 읽기</h2>
            </div>
            <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
              {secondary.map((guide) => (
                <GuideCoverLink key={guide.slug} guide={guide} />
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
