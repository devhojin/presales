'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, Copy, Building2 } from 'lucide-react'
import { useState } from 'react'

function BankTransferContent() {
  const searchParams = useSearchParams()
  const [copied, setCopied] = useState(false)

  const orderId = searchParams.get('orderId')
  const orderNumber = searchParams.get('orderNumber') || ''
  const amount = Number(searchParams.get('amount') || 0)
  const bank = searchParams.get('bank') || ''
  const account = searchParams.get('account') || ''
  const holder = searchParams.get('holder') || ''

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price) + '원'

  async function copyAccount() {
    try {
      await navigator.clipboard.writeText(account)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard API 미지원 브라우저
    }
  }

  if (!orderId) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        <p>잘못된 접근입니다.</p>
        <Link href="/store" className="text-primary hover:underline mt-4 inline-block">스토어로 이동</Link>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-16 max-w-lg">
      {/* 완료 헤더 */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">무통장 입금 신청 완료</h1>
        <p className="text-sm text-muted-foreground">
          아래 계좌로 입금해 주시면 관리자 승인 후 파일 이용이 가능합니다
        </p>
      </div>

      {/* 계좌 정보 */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-blue-700" />
          <h2 className="font-semibold text-blue-900">입금 계좌 정보</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">은행</span>
            <span className="font-semibold text-blue-900">{bank}</span>
          </div>
          <div className="flex justify-between text-sm items-center">
            <span className="text-blue-700">계좌번호</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-900">{account}</span>
              <button
                type="button"
                onClick={copyAccount}
                className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
                title="계좌번호 복사"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-blue-700">예금주</span>
            <span className="font-semibold text-blue-900">{holder}</span>
          </div>
          <div className="border-t border-blue-200 pt-3 flex justify-between">
            <span className="text-blue-700 font-medium">입금 금액</span>
            <span className="text-xl font-bold text-blue-900">{formatPrice(amount)}</span>
          </div>
        </div>
      </div>

      {/* 주문번호 */}
      <div className="bg-muted/50 rounded-xl p-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">주문번호</span>
          <span className="font-mono font-medium">{orderNumber}</span>
        </div>
      </div>

      {/* 안내 */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
        <p className="text-xs font-semibold text-yellow-800 mb-2">입금 시 유의사항</p>
        <ul className="space-y-1 text-xs text-yellow-700">
          <li>• 입금자명에 <strong>{orderNumber}</strong>을 기재해 주시면 빠른 확인이 가능합니다</li>
          <li>• 관리자가 입금 확인 후 승인하면 다운로드 권한이 열립니다</li>
          <li>• 승인 완료 후 주문 확인 이메일이 발송됩니다</li>
          <li>• 입금 후 빠른 확인은 우측 하단 채널톡으로 문의해 주세요</li>
        </ul>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/mypage"
          className="w-full h-12 rounded-lg bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center text-sm"
        >
          나의콘솔에서 주문 확인
        </Link>
        <Link
          href="/store"
          className="w-full h-12 rounded-lg border border-border text-foreground font-medium hover:bg-muted transition-colors flex items-center justify-center text-sm"
        >
          스토어 계속 둘러보기
        </Link>
      </div>
    </div>
  )
}

export default function BankTransferPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        불러오는 중...
      </div>
    }>
      <BankTransferContent />
    </Suspense>
  )
}
