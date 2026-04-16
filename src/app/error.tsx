'use client'

import Link from 'next/link'

export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="w-12 h-12 rounded-xl bg-brand-dark flex items-center justify-center mb-6">
        <span className="text-white text-sm font-bold">PS</span>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">일시적인 문제가 발생했습니다</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">새로고침하시거나, 홈으로 돌아가 다시 시도해주세요.<br />문제가 계속되면 채팅으로 문의해주세요.</p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
        >
          새로고침
        </button>
        <Link
          href="/"
          className="inline-flex items-center h-10 px-5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          홈으로 돌아가기
        </Link>
      </div>
    </div>
  )
}
