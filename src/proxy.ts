import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// KISA 보안기준: 세션 타임아웃 30분
const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_COOKIE = 'ps_last_activity'

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname

  let supabaseResponse = NextResponse.next({ request: req })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request: req })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const hasSession = !!session

  // ── KISA: 세션 타임아웃 (30분 미사용 시 자동 로그아웃) ──
  if (hasSession) {
    const lastActivity = req.cookies.get(ACTIVITY_COOKIE)?.value
    const now = Date.now()

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity, 10)
      if (elapsed > SESSION_TIMEOUT_MS) {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/login'
        url.searchParams.set('reason', 'timeout')
        const response = NextResponse.redirect(url)
        const allCookies = req.cookies.getAll()
        for (const cookie of allCookies) {
          if (cookie.name.startsWith('sb-')) {
            response.cookies.delete(cookie.name)
          }
        }
        response.cookies.delete(ACTIVITY_COOKIE)
        return response
      }
    }

    // 활동 시간 갱신
    supabaseResponse.cookies.set(ACTIVITY_COOKIE, now.toString(), {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_TIMEOUT_MS / 1000,
    })
  }

  // 보호된 경로 (로그인 필수)
  const protectedPaths = ['/mypage', '/admin']
  const isProtected = protectedPaths.some((p) => path.startsWith(p))

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('redirect', path)
    return NextResponse.redirect(url)
  }

  // 로그인 상태에서 로그인/회원가입 접근 시 리다이렉트
  if (hasSession && (path === '/auth/login' || path === '/auth/signup')) {
    return NextResponse.redirect(new URL('/mypage', req.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
