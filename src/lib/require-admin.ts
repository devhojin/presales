import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function requireAdminService(): Promise<
  | {
      ok: true
      user: { id: string; email?: string | null }
      service: SupabaseClient
    }
  | { ok: false; response: NextResponse }
> {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }),
    }
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  const { data: profile, error } = await service
    .from('profiles')
    .select('role, deleted_at')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      response: NextResponse.json({ error: '관리자 권한 확인에 실패했습니다' }, { status: 500 }),
    }
  }

  if (profile?.deleted_at) {
    return {
      ok: false,
      response: NextResponse.json({ error: '탈퇴된 계정입니다' }, { status: 403 }),
    }
  }

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 }),
    }
  }

  return { ok: true, user: { id: user.id, email: user.email ?? null }, service }
}
