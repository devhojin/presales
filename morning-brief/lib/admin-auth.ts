/**
 * presales 관리자 인증 + morning-brief Supabase service 클라이언트 반환.
 * presales DB 의 profiles.role = 'admin' 인 경우만 통과.
 *
 * 사용:
 *   const auth = await requireAdminForMorningBrief()
 *   if ('error' in auth) return NextResponse.json(...)
 *   const { mb } = auth
 *   await mb.from('subscribers').select(...)
 */
import { createServerClient } from '@supabase/ssr'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { morningBriefService } from './supabase'

export type AdminAuthResult =
  | { ok: true; userId: string; mb: SupabaseClient }
  | { ok: false; status: number; error: string }

export async function requireAdminForMorningBrief(): Promise<AdminAuthResult> {
  const cookieStore = await cookies()
  const presalesAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    },
  )

  const { data: { user }, error: authErr } = await presalesAuth.auth.getUser()
  if (authErr || !user) return { ok: false, status: 401, error: 'unauthorized' }

  const presalesService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data: profile, error: profErr } = await presalesService
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profErr || profile?.role !== 'admin') {
    return { ok: false, status: 403, error: 'forbidden' }
  }

  return { ok: true, userId: user.id, mb: morningBriefService() }
}
