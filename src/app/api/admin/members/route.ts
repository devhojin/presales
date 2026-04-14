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

  // 3. 모든 프로필 + 집계 조회 (Supabase 기본 1000건 제한 회피 위해 명시적 limit)
  const [profilesRes, ordersRes, reviewsRes] = await Promise.all([
    service
      .from('profiles')
      .select('id, email, name, phone, company, role, admin_memo, created_at')
      .order('created_at', { ascending: false })
      .limit(50000),
    service
      .from('orders')
      .select('user_id, total_amount, status')
      .limit(100000),
    service
      .from('reviews')
      .select('user_id')
      .limit(100000),
  ])

  if (profilesRes.error) {
    return NextResponse.json({ error: profilesRes.error.message }, { status: 500 })
  }

  const members = profilesRes.data || []
  const orders = ordersRes.data || []
  const reviews = reviewsRes.data || []

  // 집계 계산
  const stats: Record<string, { order_count: number; total_spent: number; review_count: number }> = {}
  for (const m of members) {
    stats[m.id] = { order_count: 0, total_spent: 0, review_count: 0 }
  }
  for (const o of orders) {
    const s = stats[o.user_id]
    if (s && (o.status === 'paid' || o.status === 'completed')) {
      s.order_count += 1
      s.total_spent += o.total_amount || 0
    }
  }
  for (const r of reviews) {
    const s = stats[r.user_id]
    if (s) s.review_count += 1
  }

  return NextResponse.json({ members, stats })
}
