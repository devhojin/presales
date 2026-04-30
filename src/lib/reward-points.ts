import type { SupabaseClient } from '@supabase/supabase-js'

export type RewardAccrualBase = 'before_discount' | 'after_discount'
export type RewardGrantType = 'signup' | 'review' | 'purchase' | 'refund' | 'admin_adjust'

export interface RewardSettings {
  enabled: boolean
  signupBonus: number
  reviewBonus: number
  accrualBase: RewardAccrualBase
  purchaseRatePercent: number
  useLimitPerOrder: number
}

export interface RewardRpcResult {
  ok?: boolean
  skipped?: boolean
  reason?: string
  ledger_id?: number
  balance_after?: number
  balance?: number
  updated?: number
}

const SETTING_KEYS = [
  'reward.enabled',
  'reward.signup_bonus',
  'reward.review_bonus',
  'reward.accrual_base',
  'reward.purchase_rate_percent',
  'reward.use_limit_per_order',
]

export const DEFAULT_REWARD_SETTINGS: RewardSettings = {
  enabled: true,
  signupBonus: 3000,
  reviewBonus: 3000,
  accrualBase: 'after_discount',
  purchaseRatePercent: 0,
  useLimitPerOrder: 10000,
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.floor(parsed))
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  return value === 'true' || value === '1' || value === 'yes'
}

function parseAccrualBase(value: string | undefined): RewardAccrualBase {
  return value === 'before_discount' ? 'before_discount' : 'after_discount'
}

export function normalizeRewardSettings(values: Record<string, string | undefined>): RewardSettings {
  return {
    enabled: readBoolean(values['reward.enabled'], DEFAULT_REWARD_SETTINGS.enabled),
    signupBonus: readNumber(values['reward.signup_bonus'], DEFAULT_REWARD_SETTINGS.signupBonus),
    reviewBonus: readNumber(values['reward.review_bonus'], DEFAULT_REWARD_SETTINGS.reviewBonus),
    accrualBase: parseAccrualBase(values['reward.accrual_base']),
    purchaseRatePercent: readNumber(
      values['reward.purchase_rate_percent'],
      DEFAULT_REWARD_SETTINGS.purchaseRatePercent,
    ),
    useLimitPerOrder: readNumber(
      values['reward.use_limit_per_order'],
      DEFAULT_REWARD_SETTINGS.useLimitPerOrder,
    ),
  }
}

export async function loadRewardSettings(supabase: SupabaseClient): Promise<RewardSettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('key, value')
    .in('key', SETTING_KEYS)

  if (error || !data) return DEFAULT_REWARD_SETTINGS

  const values: Record<string, string | undefined> = {}
  for (const row of data as Array<{ key: string; value: string }>) {
    values[row.key] = row.value
  }
  return normalizeRewardSettings(values)
}

export async function loadRewardBalance(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('profiles')
    .select('reward_balance')
    .eq('id', userId)
    .maybeSingle()

  if (error || !data) return 0
  return Math.max(0, Number((data as { reward_balance?: number | null }).reward_balance ?? 0))
}

export function clampRewardUseAmount(
  requested: number,
  balance: number,
  payableAmount: number,
  settings: RewardSettings,
): number {
  if (!settings.enabled) return 0
  const cleanRequested = Math.max(0, Math.floor(Number(requested) || 0))
  const cleanBalance = Math.max(0, Math.floor(Number(balance) || 0))
  const cleanPayable = Math.max(0, Math.floor(Number(payableAmount) || 0))
  const cleanLimit = Math.max(0, Math.floor(Number(settings.useLimitPerOrder) || 0))
  return Math.min(cleanRequested, cleanBalance, cleanPayable, cleanLimit)
}

export function calculatePurchaseReward(
  baseAmount: number,
  settings: RewardSettings,
): number {
  if (!settings.enabled || settings.purchaseRatePercent <= 0) return 0
  const base = Math.max(0, Math.floor(baseAmount))
  return Math.floor((base * settings.purchaseRatePercent) / 100)
}

function isRewardRpcResult(value: unknown): value is RewardRpcResult {
  return typeof value === 'object' && value !== null
}

export async function grantRewardPoints(
  supabase: SupabaseClient,
  params: {
    userId: string
    amount: number
    type: RewardGrantType
    sourceKey: string
    orderId?: number | null
    reviewId?: number | null
    memo?: string | null
  },
): Promise<RewardRpcResult> {
  const { data, error } = await supabase.rpc('grant_reward_points', {
    p_user_id: params.userId,
    p_amount: Math.max(0, Math.floor(params.amount)),
    p_type: params.type,
    p_source_key: params.sourceKey,
    p_order_id: params.orderId ?? null,
    p_review_id: params.reviewId ?? null,
    p_memo: params.memo ?? null,
  })
  if (error) return { ok: false, reason: error.message }
  return isRewardRpcResult(data) ? data : { ok: true }
}

export async function reserveRewardPoints(
  supabase: SupabaseClient,
  userId: string,
  orderId: number,
  amount: number,
): Promise<RewardRpcResult> {
  const { data, error } = await supabase.rpc('reserve_reward_points', {
    p_user_id: userId,
    p_order_id: orderId,
    p_amount: Math.max(0, Math.floor(amount)),
  })
  if (error) return { ok: false, reason: error.message }
  return isRewardRpcResult(data) ? data : { ok: true }
}

export async function confirmRewardPoints(
  supabase: SupabaseClient,
  orderId: number,
): Promise<RewardRpcResult> {
  const { data, error } = await supabase.rpc('confirm_reward_points', {
    p_order_id: orderId,
  })
  if (error) return { ok: false, reason: error.message }
  return isRewardRpcResult(data) ? data : { ok: true }
}

export async function rollbackRewardPoints(
  supabase: SupabaseClient,
  orderId: number,
): Promise<RewardRpcResult> {
  const { data, error } = await supabase.rpc('rollback_reward_points', {
    p_order_id: orderId,
  })
  if (error) return { ok: false, reason: error.message }
  return isRewardRpcResult(data) ? data : { ok: true }
}

export async function grantPurchaseRewardForOrder(
  supabase: SupabaseClient,
  orderId: number,
): Promise<RewardRpcResult> {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id, total_amount')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) {
    return { ok: false, reason: error?.message ?? 'order_not_found' }
  }

  const settings = await loadRewardSettings(supabase)
  if (!settings.enabled || settings.purchaseRatePercent <= 0) {
    return { ok: true, skipped: true, reason: 'purchase_reward_disabled' }
  }

  const base = Number((order as { total_amount: number }).total_amount ?? 0)
  const amount = calculatePurchaseReward(base, settings)

  return grantRewardPoints(supabase, {
    userId: (order as { user_id: string }).user_id,
    amount,
    type: 'purchase',
    sourceKey: `purchase:order:${orderId}`,
    orderId,
    memo: `구매 적립 (${settings.purchaseRatePercent}%)`,
  })
}
