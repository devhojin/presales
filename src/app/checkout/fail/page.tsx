'use client'

import { useSearchParams } from 'next/navigation'
import { XCircle } from 'lucide-react'
import Link from 'next/link'

export default function CheckoutFailPage() {
  const searchParams = useSearchParams()
  const code = searchParams.get('code')
  const message = searchParams.get('message')

  return (
    <div className="container mx-auto px-4 py-20 max-w-lg text-center">
      <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
      <h1 className="text-2xl font-bold mb-2">결제 실패</h1>
      <p className="text-muted-foreground mb-2">
        {message || '결제 처리 중 문제가 발생했습니다.'}
      </p>
      {code && (
        <p className="text-xs text-muted-foreground mb-8">오류 코드: {code}</p>
      )}
      <div className="flex gap-3 justify-center">
        <Link
          href="/cart"
          className="h-11 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors inline-flex items-center"
        >
          장바구니로 돌아가기
        </Link>
        <Link
          href="/store"
          className="h-11 px-6 rounded-lg border border-border font-medium hover:bg-muted transition-colors inline-flex items-center"
        >
          스토어로 이동
        </Link>
      </div>
    </div>
  )
}
