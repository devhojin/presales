'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import Link from 'next/link'

function UnsubscribeInner() {
  const params = useSearchParams()
  const token = params?.get('token') || ''
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('유효하지 않은 요청입니다')
      return
    }
    fetch(`/api/brief/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus('success')
          setEmail(data.email || '')
          setMessage(data.already ? '이미 수신이 거부된 상태입니다' : '수신 거부 처리가 완료되었습니다')
        } else {
          setStatus('error')
          setMessage(data.error || '처리 중 오류가 발생했습니다')
        }
      })
      .catch(() => {
        setStatus('error')
        setMessage('네트워크 오류')
      })
  }, [token])

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
        <div className="mb-6 flex justify-center">
          {status === 'loading' && <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />}
          {status === 'success' && <CheckCircle2 className="w-12 h-12 text-emerald-600" />}
          {status === 'error' && <XCircle className="w-12 h-12 text-red-500" />}
        </div>

        <h1 className="text-xl font-bold mb-2">
          {status === 'loading' ? '처리 중...' : status === 'success' ? '수신 거부 완료' : '처리 실패'}
        </h1>

        {status === 'success' && email && (
          <p className="text-sm text-muted-foreground mb-1">{email}</p>
        )}

        <p className="text-sm text-muted-foreground mb-6">{message}</p>

        {status === 'success' && (
          <p className="text-xs text-muted-foreground mb-6">
            마음이 바뀌면 언제든 다시 구독하실 수 있어요.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <Link
            href="/brief"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 cursor-pointer"
          >
            <Mail className="w-4 h-4" /> 모닝 브리프로 돌아가기
          </Link>
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            홈으로
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={<div className="py-24 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>}>
      <UnsubscribeInner />
    </Suspense>
  )
}
