import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="w-12 h-12 rounded-xl bg-brand-dark flex items-center justify-center mb-6">
        <span className="text-white text-sm font-bold">PS</span>
      </div>
      <h1 className="text-4xl font-bold text-primary mb-2">404</h1>
      <p className="text-lg font-semibold text-foreground mb-1">페이지를 찾을 수 없습니다</p>
      <p className="text-sm text-muted-foreground mb-2">찾으시는 페이지가 사라졌거나 주소가 변경되었습니다.</p>
      <p className="text-xs text-muted-foreground/70 mb-8">입찰 준비 중이시라면 스토어에서 제안서를 찾아보세요.</p>
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
          문서 스토어 둘러보기
        </Link>
      </div>
    </div>
  )
}
