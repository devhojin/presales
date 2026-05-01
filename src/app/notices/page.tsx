import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import { ArrowRight, Bell, CalendarDays, Pin } from 'lucide-react'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import {
  formatNoticeDate,
  getNoticeCategoryLabel,
  parseSiteNotices,
  SITE_NOTICES_SETTING_KEY,
  sortSiteNotices,
  type SiteNotice,
} from '@/lib/site-notices'

export const metadata: Metadata = {
  title: `공지사항 | ${SITE_NAME}`,
  description: '프리세일즈 서비스 변경, 결제, 문서 스토어, 모닝 브리프 운영 안내를 확인하세요.',
  alternates: {
    canonical: `${SITE_URL}/notices`,
  },
  openGraph: {
    title: `공지사항 | ${SITE_NAME}`,
    description: '프리세일즈 서비스 변경과 운영 안내',
    url: `${SITE_URL}/notices`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
}

export const dynamic = 'force-dynamic'

function getSupabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

async function getPublicNotices(): Promise<SiteNotice[]> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      getSupabaseKey(),
      { cookies: { getAll() { return [] } } },
    )

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', SITE_NOTICES_SETTING_KEY)
      .maybeSingle()

    if (error) return []

    return sortSiteNotices(parseSiteNotices(data?.value)).filter((notice) => notice.isPublished)
  } catch {
    return []
  }
}

export default async function NoticesPage() {
  const notices = await getPublicNotices()
  const pinned = notices.filter((notice) => notice.isPinned)
  const regular = notices.filter((notice) => !notice.isPinned)

  return (
    <main className="bg-[linear-gradient(180deg,#FAFAF9_0%,#F7F8FA_48%,#FFFFFF_100%)]">
      <section className="mx-auto max-w-[1160px] px-4 py-14 md:px-8 md:py-20">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
            <Bell className="h-3.5 w-3.5" />
            프리세일즈 운영 공지
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-950 md:text-6xl">
            공지사항
          </h1>
          <p className="mt-5 max-w-[62ch] text-base leading-8 text-zinc-600">
            사이트 변화, 결제 안내, 문서 스토어 업데이트처럼 이용자가 확인해야 할 내용을 이곳에 정리합니다.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1160px] px-4 pb-20 md:px-8">
        {notices.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-[0_28px_70px_-56px_rgba(15,23,42,0.5)]">
            <Bell className="mx-auto mb-4 h-10 w-10 text-slate-300" />
            <h2 className="text-lg font-semibold text-zinc-950">등록된 공지사항이 없습니다</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              새로운 안내가 생기면 이 페이지에 순서대로 게시됩니다.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {pinned.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-700">Pinned</p>
                <div className="grid gap-4">
                  {pinned.map((notice) => (
                    <NoticeCard key={notice.id} notice={notice} featured />
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-4">
              {regular.map((notice) => (
                <NoticeCard key={notice.id} notice={notice} />
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  )
}

function NoticeCard({ notice, featured = false }: { notice: SiteNotice; featured?: boolean }) {
  return (
    <article className={`rounded-[1.5rem] border bg-white p-6 shadow-[0_22px_60px_-52px_rgba(15,23,42,0.5)] ${
      featured ? 'border-blue-200' : 'border-slate-200'
    }`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {notice.isPinned && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white">
            <Pin className="h-3 w-3" />
            고정
          </span>
        )}
        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
          {getNoticeCategoryLabel(notice.category)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {formatNoticeDate(notice.publishedAt)}
        </span>
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">{notice.title}</h2>
      {notice.summary && (
        <p className="mt-3 text-sm leading-7 text-slate-600">{notice.summary}</p>
      )}
      {notice.body && (
        <div className="mt-5 whitespace-pre-wrap border-t border-slate-100 pt-5 text-sm leading-7 text-slate-700">
          {notice.body}
        </div>
      )}
      <Link
        href="/faq"
        className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
      >
        도움이 필요하신가요
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  )
}
