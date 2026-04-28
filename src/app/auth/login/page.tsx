'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react'
import { checkLoginLock, recordLoginFailure, resetLoginAttempts } from '@/lib/password-policy'
import { sanitizeRedirect } from '@/lib/safe-redirect'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { buildOAuthCallbackUrl } from '@/lib/oauth'

function LoginForm() {
  const searchParams = useSearchParams()
  const reason = searchParams.get('reason')
  const authError = searchParams.get('error')
  const redirectTo = searchParams.get('redirect')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(
    getAuthErrorMessage(authError) || (reason === 'timeout' ? '장시간 미사용으로 자동 로그아웃되었습니다.' : '')
  )
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [lockInfo, setLockInfo] = useState<{ locked: boolean; remainingMinutes: number }>({ locked: false, remainingMinutes: 0 })

  // 이메일 입력 후 잠금 상태 확인 (서버사이드, 500ms 디바운스)
  useEffect(() => {
    if (!email) return
    let cancelled = false
    const timer = setTimeout(async () => {
      const result = await checkLoginLock(email)
      if (!cancelled) setLockInfo(result)
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [email])

  // 잠금 중일 때 30초마다 남은 시간 갱신
  useEffect(() => {
    if (!lockInfo.locked || !email) return
    const interval = setInterval(async () => {
      const result = await checkLoginLock(email)
      setLockInfo(result)
    }, 30000)
    return () => clearInterval(interval)
  }, [lockInfo.locked, email])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    // KISA: 5회 실패 시 계정 잠금 확인 (서버사이드)
    const lock = await checkLoginLock(email)
    if (lock.locked) {
      setLockInfo(lock)
      setError(`로그인 시도 횟수를 초과했습니다. ${lock.remainingMinutes}분 후에 다시 시도해주세요.`)
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      const result = await recordLoginFailure(email)
      const updatedLock = await checkLoginLock(email)
      setLockInfo(updatedLock)

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
    await resetLoginAttempts(email)
    // redirect 파라미터가 있으면 해당 경로로, 없으면 /mypage로 이동
    // open-redirect 방지: '//evil.com', 'javascript:' 등 차단
    const destination = sanitizeRedirect(redirectTo, '/mypage')
    // Hard navigation: SPA 라우팅은 방금 세팅된 세션 쿠키가 RSC 요청에 완전히
    // 전파되기 전 middleware 가 실행되어 /admin 같은 보호 경로에서 404/리다이렉트
    // 꼬임이 발생함. window.location.href 로 풀페이지 로드하면 쿠키 전파 보장.
    window.location.href = destination
  }

  async function handleGoogleLogin() {
    setError('')
    setOauthLoading(true)

    const supabase = createClient()
    const destination = sanitizeRedirect(redirectTo, '/mypage')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildOAuthCallbackUrl(window.location.origin, destination, 'login'),
      },
    })

    if (oauthError) {
      setError('Google 로그인 시작에 실패했습니다. 다시 시도해주세요.')
      setOauthLoading(false)
    }
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

          {/* Google OAuth */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={oauthLoading}
              className="w-full h-12 rounded-full border border-border bg-white hover:bg-gray-50 flex items-center justify-center gap-3 text-sm font-medium text-gray-700 active:scale-[0.98] transition-all cursor-pointer shadow-sm"
            >
              {/* Google 공식 SVG 아이콘 */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {oauthLoading ? 'Google로 이동 중...' : 'Google로 계속하기'}
            </button>

            <div className="relative flex items-center">
              <div className="flex-1 border-t border-border" />
              <span className="mx-4 text-xs text-muted-foreground">또는</span>
              <div className="flex-1 border-t border-border" />
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
