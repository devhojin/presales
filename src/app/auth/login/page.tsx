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
      } else {
        setError(signInError.message)
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
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0B1629] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm font-bold">PS</span>
          </div>
          <h1 className="text-2xl font-bold">로그인</h1>
          <p className="text-muted-foreground text-sm mt-2">프리세일즈에 오신 것을 환영합니다</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {lockInfo.locked && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
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
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError('') }}
                className="w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || lockInfo.locked}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className="text-center">
            <Link href="/auth/forgot-password" className="text-sm text-muted-foreground hover:text-primary hover:underline cursor-pointer transition-colors">
              비밀번호를 잊으셨나요?
            </Link>
          </div>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          아직 계정이 없으신가요?{' '}
          <Link href="/auth/signup" className="text-primary font-medium hover:underline cursor-pointer">
            회원가입
          </Link>
        </p>
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
