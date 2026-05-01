'use client'

import Link from 'next/link'

export default function NoticesError() {
  return (
    <main className="mx-auto max-w-[720px] px-4 py-20 text-center md:px-8">
      <div className="rounded-[1.5rem] border border-border bg-white px-6 py-14 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.5)]">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">공지사항을 불러오지 못했습니다</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          잠시 후 다시 확인해 주세요. 서비스 이용 관련 문의는 고객지원에서 접수할 수 있습니다.
        </p>
        <Link
          href="/faq"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          고객지원으로 이동
        </Link>
      </div>
    </main>
  )
}
