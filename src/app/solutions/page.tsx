import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, FileSearch, FileText, MessageSquareText, Target } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import { SEO_LANDING_PAGES, seoLandingUrl, type SeoLandingPage } from '@/lib/seo-landing-pages'

const PAGE_URL = `${SITE_URL}/solutions`
const PAGE_TITLE = '공공입찰 수주 전략과 제안서 컨설팅'
const PAGE_DESCRIPTION =
  '공공입찰과 나라장터 제안서를 매출 채널로 만들기 위한 컨설팅, RFP 분석, 제안서 검토, PPT 템플릿, AI 제안서 작성 자료와 다음 행동을 한곳에 정리했습니다.'

export const metadata: Metadata = {
  title: `${PAGE_TITLE} | ${SITE_NAME}`,
  description: PAGE_DESCRIPTION,
  keywords: [
    '공공입찰 수주 전략',
    '입찰 제안서 컨설팅',
    '나라장터 제안서',
    'RFP 분석',
    '제안서 검토',
    '제안서 PPT 템플릿',
    'AI 제안서 작성',
  ],
  alternates: { canonical: PAGE_URL },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
    images: [{ url: '/images/hero-consulting-panel.webp', width: 1600, height: 900, alt: PAGE_TITLE }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE_TITLE} | ${SITE_NAME}`,
    description: PAGE_DESCRIPTION,
    images: ['/images/hero-consulting-panel.webp'],
  },
}

const groups: Array<{
  title: string
  description: string
  intent: SeoLandingPage['commercialIntent']
  icon: typeof Target
}> = [
  {
    title: '상담 전환',
    description: '공고 검토, RFP 분석, 제안서 전략처럼 문의 가능성이 높은 검색 의도를 모았습니다.',
    intent: 'consulting',
    icon: BriefcaseBusiness,
  },
  {
    title: '검토 전환',
    description: '제출 전 리스크를 줄이려는 담당자가 바로 문의할 수 있는 검수형 주제입니다.',
    intent: 'review',
    icon: FileSearch,
  },
  {
    title: '문서 구매',
    description: '템플릿과 발표자료를 찾는 사용자를 문서 스토어로 연결하는 주제입니다.',
    intent: 'template',
    icon: FileText,
  },
  {
    title: '학습과 육성',
    description: 'AI 활용과 실무 가이드를 통해 재방문과 상담 전환을 만드는 주제입니다.',
    intent: 'research',
    icon: MessageSquareText,
  },
]

function relativeLandingPath(page: SeoLandingPage) {
  return `/landing/${page.slug}`
}

function pagesByIntent(intent: SeoLandingPage['commercialIntent']) {
  return SEO_LANDING_PAGES.filter((page) => page.commercialIntent === intent)
}

export default function SolutionsPage() {
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: PAGE_URL,
    inLanguage: 'ko-KR',
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: SEO_LANDING_PAGES.map((page, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'WebPage',
          name: page.title,
          description: page.description,
          url: seoLandingUrl(page.slug),
          about: page.keywords,
        },
      })),
    },
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
        name: PAGE_TITLE,
        item: PAGE_URL,
      },
    ],
  })
  const featured = SEO_LANDING_PAGES.filter((page) => page.commercialIntent).slice(0, 6)

  return (
    <main className="overflow-x-hidden bg-[#F7F7F4] text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd }} />

      <section className="border-b border-border bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-10 px-4 py-14 md:grid-cols-[1fr_420px] md:px-8 md:py-20">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Revenue SEO Hub</p>
            <h1 className="mt-5 max-w-3xl break-words text-4xl font-black leading-tight tracking-normal md:text-6xl">
              공공입찰 수주 전략과 제안서 컨설팅
            </h1>
            <p className="mt-6 max-w-2xl break-words text-base leading-8 text-muted-foreground">
              검색 유입을 실제 매출로 연결하기 위해 공고 탐색, RFP 분석, 제안서 작성, 제출 전 검수, 문서 구매, 컨설팅 문의를 하나의 동선으로 묶었습니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/consulting"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
              >
                컨설팅 문의
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/store"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                문서 스토어
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="min-w-0 self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/hero-consulting-panel.webp"
              alt="공공입찰 제안서 컨설팅과 수주 전략"
              className="aspect-[4/3] w-full border border-border object-cover shadow-[0_30px_70px_-50px_rgba(15,23,42,0.7)]"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-4 py-12 md:px-8 md:py-16">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">High Intent Pages</p>
          <h2 className="mt-3 break-words text-3xl font-bold tracking-tight">매출 가능성이 높은 검색 의도</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((page) => (
            <Link
              key={page.slug}
              href={relativeLandingPath(page)}
              className="group min-w-0 border border-border bg-white p-5 transition-colors hover:border-primary/40 hover:bg-blue-50/40"
            >
              <p className="text-xs font-semibold text-primary">{page.primaryKeyword}</p>
              <h3 className="mt-2 break-words text-lg font-bold leading-7 text-foreground group-hover:text-primary">
                {page.title}
              </h3>
              <p className="mt-3 line-clamp-3 break-words text-sm leading-7 text-muted-foreground">
                {page.description}
              </p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                상세 보기
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-white">
        <div className="mx-auto max-w-[1180px] px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-5 md:grid-cols-2">
            {groups.map((group) => {
              const Icon = group.icon
              const pages = pagesByIntent(group.intent)
              return (
                <section key={group.title} className="min-w-0 border border-border bg-[#FAFAF7] p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <h2 className="mt-4 break-words text-xl font-bold">{group.title}</h2>
                  <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">{group.description}</p>
                  <div className="mt-6 grid gap-3">
                    {pages.map((page) => (
                      <Link
                        key={page.slug}
                        href={relativeLandingPath(page)}
                        className="group flex min-w-0 items-center justify-between gap-3 border-t border-border pt-3 text-sm font-semibold text-foreground hover:text-primary"
                      >
                        <span className="min-w-0 break-words">{page.primaryKeyword}</span>
                        <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                      </Link>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-6 px-4 py-12 md:grid-cols-3 md:px-8 md:py-16">
        {[
          { title: '검색 유입', body: '상업 의도 키워드별 랜딩을 sitemap과 RSS에 반영해 검색 로봇이 발견할 수 있게 합니다.' },
          { title: '전환 동선', body: '각 랜딩에서 문서 스토어, 컨설팅, AI 제안서 작성법으로 바로 이동할 수 있게 연결합니다.' },
          { title: '반복 매출', body: '모닝브리프와 입찰공고를 통해 신규 기회를 계속 확인하고 재방문 이유를 만듭니다.' },
        ].map((item) => (
          <article key={item.title} className="border border-border bg-white p-6">
            <h2 className="break-words text-xl font-bold">{item.title}</h2>
            <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
