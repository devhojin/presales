'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8">
          <div className="text-center space-y-3 mb-6">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-white text-sm font-bold">PS</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">비밀번호 찾기</h1>
              <p className="text-muted-foreground text-sm mt-2">
                가입한 이메일 주소를 입력하면 재설정 링크를 보내드립니다
              </p>
            </div>
          </div>

          {sent ? (
            <div className="space-y-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-700">이메일이 발송되었습니다</p>
                  <p className="text-xs text-green-600 mt-1">
                    비밀번호 재설정 링크를 이메일로 보냈습니다.
                    <br />
                    이메일을 확인하고 링크를 클릭해주세요.
                  </p>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                이메일이 오지 않으면 스팸함을 확인해주세요.
              </p>
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-full border border-border text-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                로그인 페이지로 돌아가기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div>
                <label className="text-sm font-medium block mb-2">이메일</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-full bg-foreground text-background font-medium text-sm hover:bg-foreground/90 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? '전송 중...' : '재설정 링크 보내기'}
              </button>

              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 w-full h-12 rounded-full border border-border text-sm font-medium hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                로그인으로 돌아가기
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
