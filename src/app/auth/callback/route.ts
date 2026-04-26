import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sanitizeRedirect } from '@/lib/safe-redirect'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = sanitizeRedirect(searchParams.get('next'), '/mypage')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`)
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(
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

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}/auth/login?error=oauth`)
  }

  // 탈퇴(soft-delete)된 계정 차단 + 동의 미완료 판별
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('deleted_at, terms_agreed_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.deleted_at) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/auth/login?error=deleted`)
    }

    // OAuth 신규 가입(또는 동의 누락): 필수 동의 화면으로 경유
    if (!profile?.terms_agreed_at) {
      const nextParam = encodeURIComponent(next)
      return NextResponse.redirect(`${origin}/auth/complete-signup?next=${nextParam}`)
    }
  }

  // OAuth 성공: 풀페이지 리다이렉트 (세션 쿠키 전파 보장)
  return NextResponse.redirect(`${origin}${next}`)
}
