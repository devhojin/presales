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

  // 3. 기본 회원 필드는 profiles 에서 직접 읽고,
  //    통계는 members_with_stats 뷰에서 병합한다.
  //    운영 DB 에 뷰 컬럼 드리프트가 있어 deleted_at/deletion_reason 는 profiles 기준으로 신뢰한다.
  const MEMBER_LIST_LIMIT = 5000
  const [{ data: membersData, error: membersError }, { data: statsData, error: statsError }] = await Promise.all([
    service
      .from('profiles')
      .select('id, email, name, phone, company, role, admin_memo, reward_balance, created_at')
      .order('created_at', { ascending: false })
      .limit(MEMBER_LIST_LIMIT),
    service
      .from('members_with_stats')
      .select('id, order_count, total_spent, review_count')
      .limit(MEMBER_LIST_LIMIT),
  ])

  if (membersError) {
    return NextResponse.json({ error: membersError.message }, { status: 500 })
  }

  if (statsError) {
    return NextResponse.json({ error: statsError.message }, { status: 500 })
  }

  if ((membersData?.length || 0) === MEMBER_LIST_LIMIT) {
    console.warn(`[admin/members] reached limit ${MEMBER_LIST_LIMIT} — pagination 도입 권고`)
  }

  const rows = (membersData || []).map((member) => ({
    ...member,
    deleted_at: null,
    deletion_reason: null,
  }))
  const statRows = statsData || []
  const members = rows
  const stats: Record<string, { order_count: number; total_spent: number; review_count: number }> = {}
  for (const r of statRows) {
    if (!r.id) continue
    stats[r.id] = {
      order_count: r.order_count ?? 0,
      total_spent: r.total_spent ?? 0,
      review_count: r.review_count ?? 0,
    }
  }

  return NextResponse.json({ members, stats })
}
