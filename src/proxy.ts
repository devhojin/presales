import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// KISA 보안기준: 세션 타임아웃 30분
const SESSION_TIMEOUT_MS = 30 * 60 * 1000
const ACTIVITY_COOKIE = 'ps_last_activity'
const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

function getRequestOrigin(req: NextRequest): string | null {
  const host = req.headers.get('host')
  if (!host) return null
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const protocol = forwardedProto || (isLocal ? 'http' : 'https')
  return normalizeOrigin(`${protocol}://${host}`)
}

function isTrustedOrigin(req: NextRequest): boolean {
  const originHeader = req.headers.get('origin')
  const fetchSite = req.headers.get('sec-fetch-site')

  if (originHeader === 'null') return false
  if (!originHeader) return fetchSite !== 'cross-site'

  const origin = normalizeOrigin(originHeader)
  if (!origin) return false

  const allowed = new Set<string>()
  const requestOrigin = getRequestOrigin(req)
  const publicSiteOrigin = normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL)
  const siteOrigin = normalizeOrigin(process.env.SITE_URL)

  if (requestOrigin) allowed.add(requestOrigin)
  if (publicSiteOrigin) allowed.add(publicSiteOrigin)
  if (siteOrigin) allowed.add(siteOrigin)
  allowed.add('https://presales.co.kr')
  allowed.add('https://www.presales.co.kr')

  if (process.env.NODE_ENV !== 'production') {
    allowed.add('http://localhost:3000')
    allowed.add('http://127.0.0.1:3000')
  }

  return allowed.has(origin)
}

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isApiPath = path.startsWith('/api/')

  // KISA/OWASP: 쿠키 기반 상태 변경 API의 cross-site 요청 차단.
  // 서버-서버 웹훅/크론은 Origin/Sec-Fetch-Site 헤더가 없으므로 통과된다.
  if (isApiPath) {
    if (UNSAFE_METHODS.has(req.method) && !isTrustedOrigin(req)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.next()
  }

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

  // Supabase 공식 권장: getUser()로 JWT 서버사이드 검증 (getSession은 토큰 무결성 미검증)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 2026-04-22 R13-B: soft-delete 된 계정은 즉시 강제 로그아웃
  // admin.auth.admin.signOut 이 실패했거나, 로컬 쿠키가 잔존한 경우의 방어선.
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('deleted_at')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.deleted_at) {
      await supabase.auth.signOut()
      const url = req.nextUrl.clone()
      url.pathname = '/auth/login'
      url.search = ''
      url.searchParams.set('error', 'deleted')
      const response = NextResponse.redirect(url)
      for (const cookie of req.cookies.getAll()) {
        if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
      }
      response.cookies.delete(ACTIVITY_COOKIE)
      return response
    }
  }

  const hasSession = !!user

  // ── KISA: 세션 타임아웃 (30분 미사용 시 자동 로그아웃) ──
  if (hasSession) {
    const lastActivity = req.cookies.get(ACTIVITY_COOKIE)?.value
    const now = Date.now()

    if (lastActivity) {
      const elapsed = now - parseInt(lastActivity, 10)
      // 결제 페이지에서는 세션 타임아웃 연장 (60분)
      const CHECKOUT_TIMEOUT_MS = 60 * 60 * 1000
      const effectiveTimeout = path.startsWith('/checkout') ? CHECKOUT_TIMEOUT_MS : SESSION_TIMEOUT_MS
      if (elapsed > effectiveTimeout) {
        const url = req.nextUrl.clone()
        url.pathname = '/auth/login'
        url.searchParams.set('reason', 'timeout')
        url.searchParams.set('redirect', path)
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

  // /admin 경로: role='admin' 체크
  // hasSession 과 user 객체가 동기화 안 될 수 있는 윈도우 대응 (세션 만료 직후 등)
  if (path.startsWith('/admin') && hasSession && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.redirect(new URL('/mypage', req.url))
    }
  } else if (path.startsWith('/admin') && !user) {
    // user 없으면 로그인으로
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
