import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * GET /api/admin/members
 * 관리자 전용: 모든 프로필 + 주문/리뷰 집계 반환
 * RLS를 우회하기 위해 service role 사용 (관리자 세션 확인 후)
 */
export async function GET() {
  // 1. 관리자 세션 확인 (anon cookies 기반)
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 2. 역할 확인 (service client로 자기 프로필 조회 — RLS 우회)
  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 })
  }

  // 3. members_with_stats 뷰 사용 — DB 에서 집계 완료 (JS 전수 로드 회피)
  // limit(5000) 명시: 기본 1000 초과 + 현실적 운영 상한
  const MEMBER_LIST_LIMIT = 5000
  const { data, error } = await service
    .from('members_with_stats')
    .select('id, email, name, phone, company, role, admin_memo, created_at, order_count, total_spent, review_count')
    .order('created_at', { ascending: false })
    .limit(MEMBER_LIST_LIMIT)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if ((data?.length || 0) === MEMBER_LIST_LIMIT) {
    console.warn(`[admin/members] reached limit ${MEMBER_LIST_LIMIT} — pagination 도입 권고`)
  }

  const rows = data || []
  // 기존 응답 구조 유지: members 배열 + stats 맵 (프런트엔드 호환)
  const members = rows.map(({ order_count, total_spent, review_count, ...m }) => {
    void order_count; void total_spent; void review_count
    return m
  })
  const stats: Record<string, { order_count: number; total_spent: number; review_count: number }> = {}
  for (const r of rows) {
    stats[r.id] = {
      order_count: r.order_count ?? 0,
      total_spent: r.total_spent ?? 0,
      review_count: r.review_count ?? 0,
    }
  }

  return NextResponse.json({ members, stats })
}
