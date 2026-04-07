'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Link from 'next/link'
import { Mail, Lock, User, Building, Phone, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { validatePassword } from '@/lib/password-policy'

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    passwordConfirm: '',
    name: '',
    company: '',
    phone: '',
  })

  const passwordCheck = validatePassword(form.password, form.email)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

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
    }

    router.push('/mypage')
    router.refresh()
  }

  const inputClass = "w-full pl-10 pr-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#0B1629] flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-sm font-bold">PS</span>
          </div>
          <h1 className="text-2xl font-bold">회원가입</h1>
          <p className="text-muted-foreground text-sm mt-2">프리세일즈와 함께 공공조달을 시작하세요</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1.5">이름 *</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" required placeholder="홍길동" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">이메일 *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="email" required placeholder="name@company.com" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">비밀번호 *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type={showPassword ? 'text' : 'password'} required
                placeholder="영대/소문자, 숫자, 특수문자 조합 8자 이상"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-10 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* 비밀번호 강도 게이지 */}
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
            <label className="block text-sm font-medium mb-1.5">비밀번호 확인 *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="password" required placeholder="비밀번호를 다시 입력하세요" value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })} className={inputClass} />
            </div>
            {form.passwordConfirm && form.password !== form.passwordConfirm && (
              <p className="mt-1 text-xs text-red-500">비밀번호가 일치하지 않습니다.</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">회사명</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="(주)OO기업" value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">연락처</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" placeholder="010-0000-0000" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
          </div>

          {/* 약관 동의 */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                <Link href="/terms" target="_blank" className="text-primary hover:underline">이용약관</Link>에 동의합니다 (필수)
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
                className="w-4 h-4 rounded border-border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground">
                <Link href="/privacy" target="_blank" className="text-primary hover:underline">개인정보처리방침</Link>에 동의합니다 (필수)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading || !agreeTerms || !agreePrivacy}
            className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
