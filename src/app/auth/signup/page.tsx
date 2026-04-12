'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, User, Building, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { validatePassword } from '@/lib/password-policy'
import { useToastStore } from '@/stores/toast-store'

// Tailwind safelist: bg-red-500 bg-orange-500 bg-yellow-500 bg-blue-500 bg-green-500
export default function SignupPage() {
  const router = useRouter()
  const { addToast } = useToastStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    company: '',
    phone: '',
  })

  const passwordCheck = validatePassword(form.password, form.email)

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

    if (!agreeTerms || !agreePrivacy) {
      setTermsError('이용약관과 개인정보처리방침에 동의해주세요')
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

    // Update profile with additional info
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({
        name: form.name,
        company: form.company,
        phone: form.phone,
      }).eq('id', user.id)

      // 회원가입 축하 쿠폰 자동 발급 (WELCOME10K)
      const { data: welcome } = await supabase
        .from('coupons')
        .select('id')
        .eq('code', 'WELCOME10K')
        .eq('is_active', true)
        .maybeSingle()
      if (welcome) {
        await supabase.from('user_coupons').insert({
          user_id: user.id,
          coupon_id: welcome.id,
          source: 'signup',
        })
      }
    }

    addToast('환영합니다! 🎉 회원가입 축하 1만원 쿠폰이 발급되었습니다', 'success')
    router.push('/mypage')
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
              <h1 className="text-2xl font-bold tracking-tight">회원가입</h1>
              <p className="text-muted-foreground text-sm mt-2">프리세일즈와 함께 공공조달을 시작하세요</p>
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
                  placeholder="영대/소문자, 숫자, 특수문자 조합 8자 이상"
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
              {form.password && (
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
              <label className="text-sm font-medium block mb-2">비밀번호 확인 *</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  required
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
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="w-4 h-4 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  <Link href="/terms" target="_blank" className="text-primary hover:text-primary/80 transition-colors">
                    이용약관
                  </Link>
                  에 동의합니다 (필수)
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreePrivacy}
                  onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="w-4 h-4 rounded border border-border cursor-pointer"
                />
                <span className="text-sm text-muted-foreground">
                  <Link href="/privacy" target="_blank" className="text-primary hover:text-primary/80 transition-colors">
                    개인정보처리방침
                  </Link>
                  에 동의합니다 (필수)
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
