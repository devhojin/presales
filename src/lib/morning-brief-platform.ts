import { createClient } from '@supabase/supabase-js'
import { subscribeEmail, unsubscribeByToken } from '../../morning-brief/lib/subscribe'

type SourceMemberState = 'member' | 'guest' | 'unknown'

export interface MorningBriefSubscribeInput {
  email: string
  name?: string | null
  sourceSite: 'presales' | 'maruai' | 'spc' | string
  sourceUserId?: string | null
  sourceMemberState?: SourceMemberState
  briefTypeKey?: string
  metadata?: Record<string, unknown>
}

export interface MorningBriefSubscribeResult {
  ok: boolean
  message?: string
  error?: string
  subscriber_id?: string
  subscription_id?: string
  status?: string
  created?: boolean
  resubscribed?: boolean
  mode: 'central-api' | 'legacy-supabase'
}

export interface MorningBriefUnsubscribeResult {
  ok: boolean
  email?: string
  already?: boolean
  error?: string
  mode: 'central-api' | 'legacy-supabase'
}

function apiUrl() {
  return process.env.MORNING_BRIEF_API_URL?.replace(/\/+$/, '') || null
}

export async function subscribeViaMorningBrief(input: MorningBriefSubscribeInput): Promise<MorningBriefSubscribeResult> {
  const central = apiUrl()
  const secret = process.env.MORNING_BRIEF_INGEST_SECRET
  if (central && secret) {
    const res = await fetch(`${central}/api/v1/subscribe`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({
        email: input.email,
        name: input.name ?? null,
        source_site: input.sourceSite,
        source_user_id: input.sourceUserId ?? null,
        source_member_state: input.sourceMemberState ?? 'unknown',
        brief_type_key: input.briefTypeKey ?? 'public_procurement_daily',
        metadata: input.metadata ?? {},
      }),
    })
    const json = await res.json().catch(() => ({})) as Omit<MorningBriefSubscribeResult, 'mode'>
    return {
      ...json,
      ok: res.ok && json.ok !== false,
      mode: 'central-api',
    }
  }

  const fallback = await subscribeEmail(
    input.email,
    input.name ?? null,
    input.sourceSite === 'maruai' || input.sourceSite === 'spc' || input.sourceSite === 'admin' || input.sourceSite === 'import'
      ? input.sourceSite
      : 'presales',
  )

  if (!fallback.ok) {
    return { ok: false, error: fallback.error, mode: 'legacy-supabase' }
  }
  return {
    ok: true,
    created: fallback.created,
    resubscribed: fallback.resubscribed,
    status: 'active',
    mode: 'legacy-supabase',
  }
}

export async function unsubscribeViaMorningBrief(token: string): Promise<MorningBriefUnsubscribeResult> {
  const central = apiUrl()
  if (central) {
    try {
      const res = await fetch(`${central}/api/unsubscribe?token=${encodeURIComponent(token)}`, {
        cache: 'no-store',
      })
      const json = await res.json().catch(() => ({})) as Omit<MorningBriefUnsubscribeResult, 'mode'>
      return {
        ...json,
        ok: res.ok && json.ok !== false,
        mode: 'central-api',
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : 'central unsubscribe failed',
        mode: 'central-api',
      }
    }
  }

  const fallback = await unsubscribeByToken(token)
  if (!fallback.ok) {
    return { ok: false, error: fallback.error, mode: 'legacy-supabase' }
  }
  return { ok: true, email: fallback.email, mode: 'legacy-supabase' }
}

export async function fetchCentralBriefStatus(email: string): Promise<Record<string, unknown> | null> {
  const central = apiUrl()
  const secret = process.env.MORNING_BRIEF_INGEST_SECRET
  if (!central || !secret) return null

  const res = await fetch(`${central}/api/v1/status?email=${encodeURIComponent(email)}`, {
    headers: { authorization: `Bearer ${secret}` },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return await res.json().catch(() => null) as Record<string, unknown> | null
}

export function presalesServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}
