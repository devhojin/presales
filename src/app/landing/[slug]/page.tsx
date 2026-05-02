import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CheckCircle2, FileText, MessageSquareText, Search, Target } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'
import { getSeoLandingDescription, getSeoLandingPage, SEO_LANDING_PAGES, seoLandingUrl } from '@/lib/seo-landing-pages'

interface PageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return SEO_LANDING_PAGES.map((page) => ({ slug: page.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const page = getSeoLandingPage(slug)
  if (!page) return { title: `페이지를 찾을 수 없습니다 | ${SITE_NAME}` }

  const url = seoLandingUrl(page.slug)
  const seoDescription = getSeoLandingDescription(page)
  return {
    title: `${page.title} | ${SITE_NAME}`,
    description: seoDescription,
    keywords: page.keywords,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      title: `${page.title} | ${SITE_NAME}`,
      description: seoDescription,
      url,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${page.title} | ${SITE_NAME}`,
      description: seoDescription,
    },
  }
}

export default async function SeoLandingPage({ params }: PageProps) {
  const { slug } = await params
  const page = getSeoLandingPage(slug)
  if (!page) notFound()

  const url = seoLandingUrl(page.slug)
  const seoDescription = getSeoLandingDescription(page)
  const conversionLinks = page.conversionLinks ?? page.relatedLinks
  const jsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: page.title,
    headline: page.title,
    description: seoDescription,
    url,
    inLanguage: 'ko-KR',
    about: page.keywords,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    mainEntity: page.contentSections.map((section) => ({
      '@type': 'CreativeWork',
      name: section.title,
      text: section.body,
    })),
    breadcrumb: {
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
          name: page.shortTitle,
          item: url,
        },
      ],
    },
  })
  const serviceJsonLd = safeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: page.title,
    description: seoDescription,
    serviceType: page.primaryKeyword,
    areaServed: {
      '@type': 'Country',
      name: 'KR',
    },
    provider: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    url,
  })
  const faqJsonLd = page.faqs?.length
    ? safeJsonLd({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: page.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      })
    : null

  return (
    <main className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serviceJsonLd }} />
      {faqJsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />}

      <section className="border-b border-border/50">
        <div className="mx-auto max-w-[1160px] px-4 py-12 md:px-8 md:py-16">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Search className="h-3.5 w-3.5" />
            {page.primaryKeyword}
          </div>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            {page.title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            {page.description}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {conversionLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {link.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/50 bg-foreground text-background">
        <div className="mx-auto grid max-w-[1160px] gap-6 px-4 py-10 md:grid-cols-[1fr_auto] md:items-center md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-background/60">Revenue Intent</p>
            <h2 className="mt-3 break-words text-2xl font-bold tracking-tight md:text-3xl">
              {page.conversionTitle ?? `${page.primaryKeyword} 문제를 빠르게 해결하세요`}
            </h2>
            <p className="mt-4 max-w-2xl break-words text-sm leading-7 text-background/72">
              {page.conversionBody ?? '검색에서 정보를 찾는 단계에서 끝나지 않고, 문서 구매나 컨설팅 문의로 바로 이어질 수 있게 필요한 자료와 다음 행동을 연결했습니다.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            {conversionLinks.slice(0, 2).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:bg-background/90"
              >
                {link.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1160px] gap-6 px-4 py-10 md:grid-cols-[1fr_1fr] md:px-8 md:py-14">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Target className="h-4 w-4 text-primary" />
            이런 담당자에게 필요합니다
          </div>
          <p className="text-sm leading-7 text-muted-foreground">{page.audience}</p>
        </div>
        <div className="grid gap-3">
          {page.keywords.map((keyword) => (
            <span
              key={keyword}
              className="inline-flex w-fit rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
            >
              {keyword}
            </span>
          ))}
        </div>
      </section>

      <section className="border-y border-border/50 bg-muted/20">
        <div className="mx-auto grid max-w-[1160px] gap-8 px-4 py-10 md:grid-cols-2 md:px-8 md:py-14">
          <div>
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">자주 막히는 지점</h2>
            <div className="space-y-4">
              {page.painPoints.map((item) => (
                <p key={item} className="border-l-2 border-red-200 pl-4 text-sm leading-7 text-muted-foreground">
                  {item}
                </p>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-5 text-2xl font-bold tracking-tight text-foreground">PRESALES 활용 방식</h2>
            <div className="space-y-4">
              {page.solutions.map((item) => (
                <p key={item} className="flex gap-3 text-sm leading-7 text-foreground">
                  <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 py-12 md:px-8 md:py-16">
        <div className="mb-8 flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight text-foreground">작성 전에 확인할 내용</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {page.contentSections.map((section) => (
            <article key={section.title} className="rounded-lg border border-border bg-card p-5">
              <h3 className="text-base font-bold leading-6 text-foreground">{section.title}</h3>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{section.body}</p>
              <ul className="mt-5 space-y-2">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="text-sm leading-6 text-foreground">
                    {bullet}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/50">
        <div className="mx-auto max-w-[1160px] px-4 py-10 md:px-8">
          <h2 className="mb-5 text-xl font-bold tracking-tight text-foreground">관련 페이지</h2>
          <div className="flex flex-wrap gap-3">
            {page.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                {link.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {page.faqs && page.faqs.length > 0 && (
        <section className="border-t border-border/50 bg-muted/20">
          <div className="mx-auto max-w-[960px] px-4 py-12 md:px-8">
            <div className="mb-8 flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight text-foreground">자주 묻는 질문</h2>
            </div>
            <div className="grid gap-4">
              {page.faqs.map((faq) => (
                <article key={faq.question} className="border border-border bg-card p-5">
                  <h3 className="break-words text-base font-bold text-foreground">{faq.question}</h3>
                  <p className="mt-3 break-words text-sm leading-7 text-muted-foreground">{faq.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
