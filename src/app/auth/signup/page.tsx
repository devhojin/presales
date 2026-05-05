'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, User, Building, Phone, Eye, EyeOff } from 'lucide-react'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'
import { getAuthErrorMessage } from '@/lib/auth-errors'
import { buildOAuthCallbackUrl } from '@/lib/oauth'
import { AgreementItem, PRIVACY_PREVIEW, TERMS_PREVIEW } from '@/components/auth/AgreementItem'
import { PasswordRequirementList } from '@/components/auth/PasswordRequirementList'

interface PublicRewardSettings {
  enabled: boolean
  signupBonus: number
}

function formatWon(amount: number) {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
}

// Tailwind safelist: bg-red-500 bg-orange-500 bg-yellow-500 bg-blue-500 bg-green-500
function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToast } = useToastStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState(getAuthErrorMessage(searchParams.get('error')))
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false) // 선택
  const [termsError, setTermsError] = useState('')
  const [signupRewardAmount, setSignupRewardAmount] = useState(0)
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    company: '',
    phone: '',
  })

  const passwordCheck = validatePassword(form.password, form.email)

  useEffect(() => {
    let active = true
    fetch('/api/rewards/settings', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as Partial<PublicRewardSettings>
      })
      .then((data) => {
        if (!active || !data || data.enabled === false) return
        const amount = Number(data.signupBonus ?? 0)
        setSignupRewardAmount(Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0)
      })
      .catch(() => {
        if (active) setSignupRewardAmount(0)
      })

    return () => {
      active = false
    }
  }, [])

  function formatPhoneNumber(value: string) {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    if (nums.length > 3 && nums.length <= 7) return nums.slice(0, 3) + '-' + nums.slice(3)
    if (nums.length > 7) return nums.slice(0, 3) + '-' + nums.slice(3, 7) + '-' + nums.slice(7)
    return nums
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setTermsError('')

    if (!agreeTerms || !agreePrivacy || !agreeAge) {
      setTermsError('필수 항목에 모두 동의해주세요 (이용약관·개인정보·만14세 이상)')
      return
    }

    // KISA 비밀번호 정책
    if (!passwordCheck.valid) {
      setError(passwordCheck.errors[0])
      return
    }

    if (form.password !== form.passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          company: form.company,
          phone: form.phone,
        },
      },
    })

    if (error) {
      setError(error.message === 'User already registered'
        ? '이미 가입된 이메일입니다.'
        : error.message)
      setLoading(false)
      return
    }

    // Update profile with additional info (실패해도 가입은 성공 — 나의콘솔에서 재입력 가능)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const nowIso = new Date().toISOString()
      const { error: profileErr } = await supabase.from('profiles').update({
        name: form.name,
        company: form.company,
        phone: form.phone,
        marketing_opt_in: agreeMarketing,
        marketing_opt_in_at: agreeMarketing ? nowIso : null,
        terms_agreed_at: nowIso,
        privacy_agreed_at: nowIso,
        overseas_agreed_at: nowIso,
        age_agreed_at: nowIso,
      }).eq('id', user.id)
      if (profileErr) {
        console.warn('[signup] 프로필 부가정보 저장 실패:', profileErr.message)
      }

      try {
        await fetch('/api/rewards/signup', { method: 'POST' })
      } catch {
        // 가입 혜택 지급 실패는 가입 성공에 영향 없음
      }
    }

    // 환영 이메일 발송 (fire-and-forget: 실패해도 가입 성공으로 처리)
    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: form.email, name: form.name }),
    }).catch(() => {
      // 이메일 발송 실패는 가입 성공에 영향 없음
    })

    addToast('환영합니다! 회원가입 혜택이 지급되었습니다', 'success')
    router.push('/mypage')
    router.refresh()
  }

  async function handleGoogleSignup() {
    setError('')
    setTermsError('')
    setOauthLoading(true)

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: buildOAuthCallbackUrl(window.location.origin, '/mypage', 'signup'),
      },
    })

    if (oauthError) {
      setError('Google 회원가입 시작에 실패했습니다. 다시 시도해주세요.')
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
              <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
              <p className="text-muted-foreground text-sm mt-2">프리세일즈와 함께 공공조달을 시작하세요</p>
            </div>
          </div>

          {signupRewardAmount > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
              <p className="text-sm font-semibold text-blue-900">
                회원가입 완료 시 {formatWon(signupRewardAmount)} 적립금 지급
              </p>
              <p className="mt-1 text-xs leading-relaxed text-blue-700">
                가입 후 장바구니 결제 단계에서 쿠폰과 함께 사용할 수 있습니다.
              </p>
            </div>
          )}

          {/* Google OAuth */}
          <div className="space-y-4">
            <button
              type="button"
              onClick={handleGoogleSignup}
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
              <span className="mx-4 text-xs text-muted-foreground">또는 이메일로 가입</span>
              <div className="flex-1 border-t border-border" />
            </div>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">이름 *</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="홍길동"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">이메일 *</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="name@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">비밀번호 *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder="10자 이상, 영문 대/소문자·숫자·특수문자 포함"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              <div className="mt-2 space-y-1.5">
                {form.password && (
                  <>
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
                        {passwordCheck.label}
                      </span>
                    </div>
                  </>
                )}
                <PasswordRequirementList password={form.password} email={form.email} />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">비밀번호 확인 *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={form.passwordConfirm}
                  onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                  className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
              {form.passwordConfirm && form.password !== form.passwordConfirm && (
                <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">회사명</label>
              <div className="relative">
                <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  autoComplete="organization"
                  placeholder="(주)OO기업"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">연락처</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="tel"
                  autoComplete="tel"
                  placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => {
                    const formatted = formatPhoneNumber(e.target.value)
                    setForm({ ...form, phone: formatted })
                  }}
                  className="w-full h-11 pl-11 pr-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
              {/* 전체 동의 */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms && agreePrivacy && agreeAge && agreeMarketing}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setAgreeTerms(checked)
                    setAgreePrivacy(checked)
                    setAgreeAge(checked)
                    setAgreeMarketing(checked)
                  }}
                  className="w-5 h-5 rounded border border-border cursor-pointer accent-primary"
                />
                <div>
                  <span className="text-sm font-semibold text-foreground">전체 동의</span>
                  <span className="text-xs text-muted-foreground ml-1.5">(필수 및 선택 항목 포함)</span>
                </div>
              </label>
              <div className="border-t border-border/50" />

              <AgreementItem
                checked={agreeTerms}
                onCheckedChange={setAgreeTerms}
                href="/terms"
                label="이용약관"
                preview={TERMS_PREVIEW}
              />
              <AgreementItem
                checked={agreePrivacy}
                onCheckedChange={setAgreePrivacy}
                href="/privacy"
                label="개인정보처리방침"
                preview={PRIVACY_PREVIEW}
              />
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="w-4 h-4 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  본인은 만 14세 이상입니다 (필수)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeMarketing}
                  onChange={(e) => setAgreeMarketing(e.target.checked)}
                  className="w-4 h-4 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  마케팅 정보 수신(이메일·SMS)에 동의합니다 <span className="text-muted-foreground/70">(선택 · 정보통신망법 제50조)</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-foreground text-background font-medium text-sm hover:bg-foreground/90 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>

            {termsError && (
              <p className="text-sm text-red-600 text-center">{termsError}</p>
            )}
          </form>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">이미 계정이 있으신가요? </span>
            <Link href="/auth/login" className="text-primary font-medium hover:text-primary/80 transition-colors cursor-pointer">
              로그인
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
