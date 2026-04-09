'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { checkLoginLock, recordLoginFailure, resetLoginAttempts } from '@/lib/password-policy'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const redirectTo = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(reason === 'timeout' ? '장시간 미사용으로 자동 로그아웃되었습니다.' : '')
  const [loading, setLoading] = useState(false)
  const [lockInfo, setLockInfo] = useState<{ locked: boolean; remainingMinutes: number }>({ locked: false, remainingMinutes: 0 })

  useEffect(() => {
    setLockInfo(checkLoginLock())
    const interval = setInterval(() => setLockInfo(checkLoginLock()), 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // KISA: 5회 실패 시 계정 잠금 확인
    const lock = checkLoginLock()
    if (lock.locked) {
      setLockInfo(lock)
      setError(`로그인 시도 횟수를 초과했습니다. ${lock.remainingMinutes}분 후에 다시 시도해주세요.`)
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      const result = recordLoginFailure()
      setLockInfo(checkLoginLock())

      if (result.locked) {
        setError('로그인 시도 횟수(5회)를 초과했습니다. 15분 후에 다시 시도해주세요.')
      } else if (signInError.message === 'Invalid login credentials') {
        setError(`이메일 또는 비밀번호가 올바르지 않습니다. (남은 시도: ${result.attemptsLeft}회)`)
      } else if (signInError.message === 'Email not confirmed') {
        setError('이메일 인증이 완료되지 않았습니다')
      } else {
        setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.')
      }
      setLoading(false)
      return
    }

    // 성공 시 시도 횟수 초기화
    resetLoginAttempts()
    // redirect 파라미터가 있으면 해당 경로로, 없으면 /mypage로 이동
    const destination = redirectTo && redirectTo.startsWith('/') ? redirectTo : '/mypage'
    router.push(destination)
    router.refresh()
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border/50 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-8 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center mx-auto">
              <span className="text-white text-sm font-bold">PS</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">로그인</h1>
              <p className="text-muted-foreground text-sm mt-2">프리세일즈에 오신 것을 환영합니다</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {lockInfo.locked && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">계정 보호 잠금</p>
                  <p className="text-xs text-red-600 mt-1">
                    로그인 시도 횟수(5회)를 초과하여 계정이 일시 잠금되었습니다.
                    <br />{lockInfo.remainingMinutes}분 후에 다시 시도해주세요.
                  </p>
                </div>
              </div>
            )}

            {error && !lockInfo.locked && (
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

            <div>
              <label className="text-sm font-medium block mb-2">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="비밀번호를 입력하세요"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  className="w-full h-11 pl-11 pr-11 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || lockInfo.locked}
              className="w-full h-12 rounded-full bg-foreground text-background font-medium text-sm hover:bg-foreground/90 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div className="text-center">
              <Link href="/auth/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">아직 계정이 없으신가요? </span>
            <Link href="/auth/signup" className="text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer">
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
