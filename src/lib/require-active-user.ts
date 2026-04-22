import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

/**
 * 2026-04-22 R13-B 헬퍼:
 * 인증 쿠키 세션에서 user 를 읽고, profiles.deleted_at 이 세팅된 soft-deleted
 * 계정은 403 으로 차단한다. admin.signOut() 이 실패했거나 JWT 가 1시간 내
 * 만료 전이라 유효해도 여기서 다시 걸러낸다.
 *
 * 반환:
 *   { user, supabase }  — 활성 유저
 *   { response }        — 401/403 NextResponse (즉시 return)
 */
export async function requireActiveUser(): Promise<
  | { ok: true; user: { id: string; email?: string | null }; supabase: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
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
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    }
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
