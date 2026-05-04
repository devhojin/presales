'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useToastStore } from '@/stores/toast-store'
import { sanitizeRedirect } from '@/lib/safe-redirect'
import { AgreementItem, PRIVACY_PREVIEW, TERMS_PREVIEW } from '@/components/auth/AgreementItem'

interface PublicRewardSettings {
  enabled: boolean
  signupBonus: number
}

function formatWon(amount: number) {
  return `${new Intl.NumberFormat('ko-KR').format(amount)}원`
}

export default function CompleteSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = sanitizeRedirect(searchParams.get('next'), '/mypage')
  const { addToast } = useToastStore()

  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')

  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeAge, setAgreeAge] = useState(false)
  const [agreeMarketing, setAgreeMarketing] = useState(false)
  const [error, setError] = useState('')
  const [signupRewardAmount, setSignupRewardAmount] = useState(0)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.replace('/auth/login')
        return
      }
      setEmail(user.email ?? '')
      const meta = user.user_metadata ?? {}
      setName((meta.full_name || meta.name || '') as string)
      setReady(true)
    })
  }, [router])

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!agreeTerms || !agreePrivacy || !agreeAge) {
      setError('필수 항목에 모두 동의해주세요 (이용약관·개인정보·만14세 이상)')
      return
    }
    if (!name.trim()) {
      setError('이름을 입력해주세요')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agreeTerms,
          agreePrivacy,
          agreeAge,
          agreeMarketing,
          name,
          company,
          phone,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? '처리에 실패했습니다')
        setLoading(false)
        return
      }

      if (json.couponIssued) {
        addToast('환영합니다! 회원가입 축하 1만원 쿠폰이 발급되었습니다', 'success')
      } else {
        addToast('가입이 완료되었습니다', 'success')
      }
      router.push(next)
      router.refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류'
      setError(msg)
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4 py-8 bg-background">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    )
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
              <p className="text-muted-foreground text-sm mt-2">
                약관 동의와 기본 정보 입력 후 서비스를 시작할 수 있습니다
              </p>
              {email && (
                <p className="text-xs text-muted-foreground mt-2">
                  로그인: <span className="font-medium text-foreground">{email}</span>
                </p>
              )}
            </div>
          </div>

          {signupRewardAmount > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-left">
              <p className="text-sm font-semibold text-blue-900">
                가입 완료 시 {formatWon(signupRewardAmount)} 적립금 지급
              </p>
              <p className="mt-1 text-xs leading-relaxed text-blue-700">
                약관 동의와 기본 정보 입력이 끝나면 현재 적립금 정책에 따라 지급됩니다.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">이름 *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">회사명</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="(주)OO기업"
                className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">연락처</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                className="w-full h-11 px-4 border border-border rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
              />
            </div>

            <div className="space-y-3 pt-4 border-t border-border">
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
                  마케팅 정보 수신(이메일·SMS)에 동의합니다 <span className="text-muted-foreground/70">(선택)</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-full bg-foreground text-background font-medium text-sm hover:bg-foreground/90 disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
            >
              {loading ? '처리 중...' : '가입 완료하기'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
