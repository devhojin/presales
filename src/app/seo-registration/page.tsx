import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, CircleDashed } from 'lucide-react'
import {
  NAVER_REGISTRATION_DATE,
  getNaverLandingPagesByStatus,
  naverLandingUrl,
} from '@/lib/seo-landing-pages'

export const metadata: Metadata = {
  title: '네이버 랜딩페이지 등록 관리',
  description: '네이버 웹마스터 도구 수동 등록용 랜딩페이지 목록입니다.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
}

function LandingList({
  title,
  description,
  pages,
  variant,
}: {
  title: string
  description: string
  pages: ReturnType<typeof getNaverLandingPagesByStatus>
  variant: 'registered' | 'unregistered'
}) {
  const Icon = variant === 'registered' ? CheckCircle2 : CircleDashed
  const badgeClass =
    variant === 'registered'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <section className="rounded-lg border border-border bg-white p-5 md:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            <Icon className="h-3.5 w-3.5" />
            {pages.length}개
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
        </div>
      </div>
      <ol className="mt-6 grid gap-2">
        {pages.map((page, index) => {
          const url = naverLandingUrl(page.slug)
          return (
            <li key={page.slug} className="grid gap-2 border-t border-border py-3 md:grid-cols-[48px_1fr_auto] md:items-center">
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{page.primaryKeyword}</p>
                <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">{url}</p>
              </div>
              <Link
                href={`/landing/${page.slug}`}
                className="inline-flex h-9 w-fit items-center gap-2 rounded-full border border-border px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                열기
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export default function SeoRegistrationPage() {
  const registeredPages = getNaverLandingPagesByStatus('registered')
  const unregisteredPages = getNaverLandingPagesByStatus('unregistered')

  return (
    <main className="min-h-screen bg-[#F7F7F4] px-4 py-10 text-foreground md:px-8 md:py-14">
      <div className="mx-auto max-w-[1180px]">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Naver Webmaster Queue</p>
          <h1 className="mt-3 break-words text-4xl font-black leading-tight tracking-tight md:text-5xl">
            네이버 랜딩페이지 등록 관리
          </h1>
          <p className="mt-4 max-w-3xl break-words text-sm leading-7 text-muted-foreground">
            프리세일즈 네이버 웹마스터 도구 기준으로 등록된 랜딩페이지와 앞으로 수동 등록할 미등록 랜딩페이지를 분리했습니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs font-semibold text-muted-foreground">
            <span className="rounded-full border border-border bg-white px-3 py-1">등록 기준일 {NAVER_REGISTRATION_DATE}</span>
            <span className="rounded-full border border-border bg-white px-3 py-1">등록 {registeredPages.length}개</span>
            <span className="rounded-full border border-border bg-white px-3 py-1">미등록 {unregisteredPages.length}개</span>
          </div>
        </div>

        <div className="grid gap-7">
          <LandingList
            title="등록 리스트"
            description="네이버 웹마스터 도구에 이미 수동 등록한 것으로 분류한 랜딩페이지입니다."
            pages={registeredPages}
            variant="registered"
          />
          <LandingList
            title="미등록 리스트"
            description="매일 수동 등록할 랜딩페이지입니다. 아래 URL을 순서대로 네이버 웹마스터 도구에 등록하면 됩니다."
            pages={unregisteredPages}
            variant="unregistered"
          />
        </div>
      </div>
    </main>
  )
}
