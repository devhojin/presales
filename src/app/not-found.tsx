import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="w-12 h-12 rounded-xl bg-[#0B1629] flex items-center justify-center mb-6">
        <span className="text-white text-sm font-bold">PS</span>
      </div>
      <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-8">페이지를 찾을 수 없습니다</p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          홈으로 돌아가기
        </Link>
        <Link
          href="/store"
          className="inline-flex items-center h-10 px-5 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors"
        >
          스토어 둘러보기
        </Link>
      </div>
    </div>
  )
}
