import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { getRfpAnalysisGuestId } from '@/lib/rfp-analysis'

export const RFP_ANALYSIS_GUEST_HEADER = 'x-rfp-analysis-guest-id'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type ActiveUser = {
  id: string
  email?: string | null
}

export type RfpAnalysisActor =
  | {
      kind: 'user'
      user: ActiveUser
      ownerId: string
      storageOwnerId: string
      rateLimitKey: string
    }
  | {
      kind: 'guest'
      guestId: string
      ownerId: string
      storageOwnerId: string
      rateLimitKey: string
    }

export type OptionalActiveUserResult =
  | { ok: true; user: ActiveUser | null; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }

export type RfpAnalysisActorResult =
  | { ok: true; actor: RfpAnalysisActor }
  | { ok: false; response: NextResponse }

export function normalizeRfpAnalysisGuestId(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return UUID_RE.test(trimmed) ? trimmed.toLowerCase() : null
}

async function getOptionalActiveUser(): Promise<OptionalActiveUserResult> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { ok: true, user: null, supabase }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('deleted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.deleted_at) {
    try { await supabase.auth.signOut() } catch {}
    return {
      ok: false,
      response: NextResponse.json({ error: '탈퇴된 계정입니다' }, { status: 403 }),
    }
  }

  return { ok: true, user: { id: user.id, email: user.email ?? null }, supabase }
}

export async function getRfpAnalysisActor(
  request: Request,
  bodyGuestId?: unknown,
): Promise<RfpAnalysisActorResult> {
  const auth = await getOptionalActiveUser()
  if (!auth.ok) return auth

  if (auth.user) {
    return {
      ok: true,
      actor: {
        kind: 'user',
        user: auth.user,
        ownerId: auth.user.id,
        storageOwnerId: auth.user.id,
        rateLimitKey: `user:${auth.user.id}`,
      },
    }
  }

  const guestId = normalizeRfpAnalysisGuestId(request.headers.get(RFP_ANALYSIS_GUEST_HEADER))
    || normalizeRfpAnalysisGuestId(bodyGuestId)

  if (!guestId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: '비회원 분석 식별값이 필요합니다. 페이지를 새로고침한 뒤 다시 시도해주세요.' },
        { status: 400 },
      ),
    }
  }

  return {
    ok: true,
    actor: {
      kind: 'guest',
      guestId,
      ownerId: guestId,
      storageOwnerId: `guest/${guestId}`,
      rateLimitKey: `guest:${guestId}`,
    },
  }
}

export function isRfpAnalysisJobOwnedByActor(
  actor: RfpAnalysisActor,
  job: { user_id?: string | null; result_json?: unknown },
) {
  if (actor.kind === 'user') return job.user_id === actor.user.id
  return getRfpAnalysisGuestId(job.result_json) === actor.guestId
}
