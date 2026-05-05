import type { SupabaseClient } from '@supabase/supabase-js'
import { GLOBAL_FREE_USER_LIMIT, GLOBAL_FREE_USER_LIMIT_ERROR } from '@/lib/free-access-policy'
import { logger } from '@/lib/logger'

const FREE_USER_SCAN_LIMIT = 5000

type FreeUsageRow = {
  user_id: string | null
}

type FreeProductDownloadRow = {
  user_id: string | null
  products?: { is_free?: boolean | null } | { is_free?: boolean | null }[] | null
}

type ExistingUsageRow = {
  id: string | number
}

export type FreeUserLimitResult = {
  allowed: boolean
  limit: number
  used: number
  isExistingFreeUser: boolean
  error?: string
}

function addUserId(target: Set<string>, value: string | null | undefined) {
  if (typeof value === 'string' && value.trim()) target.add(value)
}

function hasRows(data: ExistingUsageRow[] | null): boolean {
  return Array.isArray(data) && data.length > 0
}

function normalizeProductRef(value: FreeProductDownloadRow['products']) {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

async function hasExistingFreeUsage(supabase: SupabaseClient, userId: string) {
  const [orders, downloads, analyses] = await Promise.all([
    supabase
      .from('orders')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['paid', 'completed'])
      .eq('total_amount', 0)
      .limit(1),
    supabase
      .from('download_logs')
      .select('id, products!inner(is_free)')
      .eq('user_id', userId)
      .eq('products.is_free', true)
      .limit(1),
    supabase
      .from('rfp_analysis_jobs')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
  ])

  if (orders.error) throw orders.error
  if (downloads.error) throw downloads.error
  if (analyses.error) throw analyses.error

  return hasRows(orders.data as ExistingUsageRow[] | null)
    || hasRows(downloads.data as ExistingUsageRow[] | null)
    || hasRows(analyses.data as ExistingUsageRow[] | null)
}

async function collectFreeUserIds(supabase: SupabaseClient) {
  const [orders, downloads, analyses] = await Promise.all([
    supabase
      .from('orders')
      .select('user_id')
      .in('status', ['paid', 'completed'])
      .eq('total_amount', 0)
      .limit(FREE_USER_SCAN_LIMIT),
    supabase
      .from('download_logs')
      .select('user_id, products!inner(is_free)')
      .eq('products.is_free', true)
      .limit(FREE_USER_SCAN_LIMIT),
    supabase
      .from('rfp_analysis_jobs')
      .select('user_id')
      .limit(FREE_USER_SCAN_LIMIT),
  ])

  if (orders.error) throw orders.error
  if (downloads.error) throw downloads.error
  if (analyses.error) throw analyses.error

  const userIds = new Set<string>()
  for (const row of (orders.data ?? []) as FreeUsageRow[]) {
    addUserId(userIds, row.user_id)
  }
  for (const row of (downloads.data ?? []) as FreeProductDownloadRow[]) {
    const product = normalizeProductRef(row.products)
    if (product?.is_free === true) addUserId(userIds, row.user_id)
  }
  for (const row of (analyses.data ?? []) as FreeUsageRow[]) {
    addUserId(userIds, row.user_id)
  }

  return userIds
}

export async function checkGlobalFreeUserLimit(
  supabase: SupabaseClient,
  userId: string,
): Promise<FreeUserLimitResult> {
  try {
    const isExistingFreeUser = await hasExistingFreeUsage(supabase, userId)
    if (isExistingFreeUser) {
      const userIds = await collectFreeUserIds(supabase)
      return {
        allowed: true,
        limit: GLOBAL_FREE_USER_LIMIT,
        used: userIds.size,
        isExistingFreeUser: true,
      }
    }

    const userIds = await collectFreeUserIds(supabase)
    const used = userIds.size
    const allowed = used < GLOBAL_FREE_USER_LIMIT

    return {
      allowed,
      limit: GLOBAL_FREE_USER_LIMIT,
      used,
      isExistingFreeUser: false,
      error: allowed ? undefined : GLOBAL_FREE_USER_LIMIT_ERROR,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    logger.error('무료 이용자 제한 조회 실패', 'free-user-limit', { error: message })
    return {
      allowed: false,
      limit: GLOBAL_FREE_USER_LIMIT,
      used: 0,
      isExistingFreeUser: false,
      error: '무료 이용 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.',
    }
  }
}
