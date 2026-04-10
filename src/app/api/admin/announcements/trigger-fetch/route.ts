import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { fetchAllAnnouncements } from '@/lib/fetch-announcements'
import { NextResponse } from 'next/server'

/**
 * Admin trigger: Manually fetch announcements from K-Startup API
 * POST handler with admin auth
 */
export async function POST() {
  // 1. Auth check
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  try {
    // 2. Fetch announcements (K-Startup + 기업마당)
    const fetchResult = await fetchAllAnnouncements()

    // 3. Check for errors
    const errors = fetchResult.results.flatMap(r => r.errors)
    if (errors.length > 0 && fetchResult.totalInserted === 0) {
      return NextResponse.json({
        success: false,
        error: errors.join('; '),
        results: fetchResult.results,
      }, { status: 500 })
    }

    // 4. Build source summary
    const sources = fetchResult.results.map(r => `${r.source}: 신규 ${r.inserted}, 중복 ${r.skipped}`).join(' / ')

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `공고 수집 완료 — ${sources}`,
      results: fetchResult.results,
      summary: {
        totalInserted: fetchResult.totalInserted,
        totalSkipped: fetchResult.totalSkipped,
        totalBlocked: fetchResult.totalBlocked,
      },
    })
  } catch (error) {
    console.error('Trigger fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}
