'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'

function ResetPasswordForm() {
  const router = useRouter()
  const { addToast } = useToastStore()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sessionReady, setSessionReady] = useState(false)

  const passwordCheck = validatePassword(password)

  useEffect(() => {
    // Supabase가 URL 해시에서 토큰을 자동으로 처리함
    // onAuthStateChange로 PASSWORD_RECOVERY 이벤트 감지
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })

    // 이미 세션이 있는 경우 (페이지 새로고침 등)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!passwordCheck.valid) {
      setError(passwordCheck.errors[0])
      return
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    addToast('비밀번호가 변경되었습니다', 'success')
    router.push('/mypage')
    router.refresh()
  }

  if (!sessionReady) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="w-12 h-12 rounded-xl bg-[#0B1629] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm font-bold">PS</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">비밀번호 재설정</h1>
          <p className="text-muted-foreground text-sm mb-6">링크를 확인하는 중입니다...</p>
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            이메일의 재설정 링크를 통해 접속해주세요.
            <br />
            링크가 만료된 경우{' '}
            <Link href="/auth/forgot-password" className="font-medium underline cursor-pointer">
              다시 요청
            </Link>
            해주세요.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0B1629] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm font-bold">PS</span>
          </div>
          <h1 className="text-2xl font-bold">새 비밀번호 설정</h1>
          <p className="text-muted-foreground text-sm mt-2">
            새로운 비밀번호를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">새 비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="영대/소문자, 숫자, 특수문자 조합 8자 이상"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* 비밀번호 강도 게이지 */}
            {password && (
              <div className="mt-2 space-y-1.5">
                <div className="flex gap-1">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        i <= passwordCheck.score ? passwordCheck.color : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium ${passwordCheck.valid ? 'text-green-600' : 'text-gray-500'}`}>
                    {passwordCheck.valid && <ShieldCheck className="w-3 h-3 inline mr-1" />}
                    {passwordCheck.label}
                  </span>
                  {!passwordCheck.valid && passwordCheck.errors[0] && (
                    <span className="text-xs text-red-500">{passwordCheck.errors[0]}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">비밀번호 확인</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                required
                placeholder="비밀번호를 다시 입력하세요"
                value={passwordConfirm}
                onChange={(e) => { setPasswordConfirm(e.target.value); setError('') }}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            {passwordConfirm && password !== passwordConfirm && (
              <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? '변경 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
