'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Coins, Loader2, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  DEFAULT_REWARD_SETTINGS,
  normalizeRewardSettings,
} from '@/lib/reward-points'
import type { RewardSettings } from '@/lib/reward-points'

const REWARD_SETTING_KEYS = [
  'reward.enabled',
  'reward.signup_bonus',
  'reward.review_bonus',
  'reward.accrual_base',
  'reward.purchase_rate_percent',
  'reward.use_limit_per_order',
]

function toSettingsMap(settings: RewardSettings): Record<string, string> {
  return {
    'reward.enabled': String(settings.enabled),
    'reward.signup_bonus': String(settings.signupBonus),
    'reward.review_bonus': String(settings.reviewBonus),
    'reward.accrual_base': 'after_discount',
    'reward.purchase_rate_percent': String(settings.purchaseRatePercent),
    'reward.use_limit_per_order': String(settings.useLimitPerOrder),
  }
}

function UnitInput({
  value,
  onChange,
  unit,
  step,
}: {
  value: number
  onChange: (value: string) => void
  unit: '원' | '%'
  step: number
}) {
  return (
    <div className="relative flex-1">
      <input
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-xl border border-border px-3 pr-11 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
        {unit}
      </span>
    </div>
  )
}

export default function RewardSettingsPage() {
  const [settings, setSettings] = useState<RewardSettings>(DEFAULT_REWARD_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', REWARD_SETTING_KEYS)

      const values: Record<string, string | undefined> = {}
      for (const row of (data ?? []) as Array<{ key: string; value: string }>) {
        values[row.key] = row.value
      }
      setSettings(normalizeRewardSettings(values))
      setLoading(false)
    }
    load()
  }, [])

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  function updateNumber(key: keyof Pick<RewardSettings, 'signupBonus' | 'reviewBonus' | 'purchaseRatePercent' | 'useLimitPerOrder'>, value: string) {
    const parsed = Math.max(0, Math.floor(Number(value) || 0))
    setSettings((prev) => ({ ...prev, [key]: parsed }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const supabase = createClient()
      const rows = Object.entries(toSettingsMap(settings)).map(([key, value]) => ({ key, value }))
      const { error } = await supabase
        .from('site_settings')
        .upsert(rows, { onConflict: 'key' })
      if (error) throw error
      showToast('적립금 설정이 저장되었습니다.', 'success')
    } catch (err) {
      console.error(err)
      showToast('저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-xl px-5 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Coins className="h-6 w-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">적립금 설정</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              회원가입, 후기, 구매 적립과 주문별 사용 한도를 관리합니다
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <Link
          href="/admin/settings"
          className="inline-flex h-9 items-center rounded-xl border border-border bg-white px-4 text-sm font-medium hover:bg-muted"
        >
          사이트 설정
        </Link>
        <Link
          href="/admin/settings/rewards"
          className="inline-flex h-9 items-center rounded-xl bg-primary px-4 text-sm font-medium text-white"
        >
          적립금
        </Link>
      </div>

      <div className="space-y-6">
        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border/50 bg-muted px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">지급 정책</h2>
          </div>
          <div className="divide-y divide-gray-100">
            <div className="flex items-center gap-4 px-6 py-4">
              <label className="w-48 shrink-0 text-sm font-medium text-foreground">적립금 사용</label>
              <button
                type="button"
                onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
                className={`h-8 rounded-full px-4 text-sm font-medium cursor-pointer ${
                  settings.enabled ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                }`}
              >
                {settings.enabled ? '사용' : '중지'}
              </button>
            </div>
            <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center">
              <label className="w-48 shrink-0 text-sm font-medium text-foreground">신규회원 지급액</label>
              <UnitInput
                value={settings.signupBonus}
                onChange={(value) => updateNumber('signupBonus', value)}
                unit="원"
                step={100}
              />
            </div>
            <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center">
              <label className="w-48 shrink-0 text-sm font-medium text-foreground">후기 작성 지급액</label>
              <UnitInput
                value={settings.reviewBonus}
                onChange={(value) => updateNumber('reviewBonus', value)}
                unit="원"
                step={100}
              />
            </div>
            <div className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center">
              <div className="w-48 shrink-0">
                <label className="text-sm font-medium text-foreground">구매 적립률</label>
                <p className="mt-1 text-xs text-muted-foreground">최종 결제금액 기준</p>
              </div>
              <UnitInput
                value={settings.purchaseRatePercent}
                onChange={(value) => updateNumber('purchaseRatePercent', value)}
                unit="%"
                step={1}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-white">
          <div className="border-b border-border/50 bg-muted px-6 py-4">
            <h2 className="text-sm font-semibold text-foreground">계산 기준</h2>
          </div>
          <div className="space-y-4 px-6 py-4">
            <div>
              <p className="text-sm font-medium text-foreground">구매 적립 계산 기준</p>
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-3">
                <p className="text-sm font-semibold text-primary">최종 결제금액 기준</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-700">
                  상품 할인, 쿠폰, 적립금 사용을 모두 반영한 실제 결제금액에 구매 적립률을 적용합니다.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="w-48 shrink-0 text-sm font-medium text-foreground">1회 사용 한도</label>
              <UnitInput
                value={settings.useLimitPerOrder}
                onChange={(value) => updateNumber('useLimitPerOrder', value)}
                unit="원"
                step={100}
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
