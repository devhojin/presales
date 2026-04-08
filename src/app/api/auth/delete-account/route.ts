import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function DELETE() {
  try {
    // 인증 확인 (서버사이드 쿠키)
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Server Component에서는 무시
            }
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // Service Role 클라이언트로 auth.users 삭제
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // profiles 삭제 (cascade가 없는 경우 명시적으로)
    await supabase.from('profiles').delete().eq('id', user.id)

    // auth.users 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)
    if (deleteError) {
      return NextResponse.json({ error: '계정 삭제에 실패했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '계정이 삭제되었습니다.' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    console.error('[delete-account]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
