import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { markOrderMemoRead } from '@/lib/admin-read-state'
import { logger } from '@/lib/logger'

async function getAdminService() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }) }
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'admin') {
    return { response: NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 }) }
  }

  return { service }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAdminService()
    if ('response' in context) return context.response

    const body = (await request.json().catch(() => ({}))) as { orderIds?: unknown }
    const ids = Array.isArray(body.orderIds)
      ? Array.from(new Set(body.orderIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)))
      : []

    if (ids.length === 0) {
      return NextResponse.json({ error: '읽음 처리할 주문이 없습니다' }, { status: 400 })
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: '한 번에 최대 200건까지 처리 가능합니다' }, { status: 400 })
    }

    const readAt = new Date().toISOString()
    const { service } = context
    const { data: orders, error: fetchError } = await service
      .from('orders')
      .select('id, admin_memo')
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results = await Promise.all(
      (orders || []).map((order) =>
        service
          .from('orders')
          .update({
            admin_memo: markOrderMemoRead(order.admin_memo, readAt),
            updated_at: readAt,
          })
          .eq('id', order.id),
      ),
    )

    const failed = results.find((result) => result.error)
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, readAt, orderIds: (orders || []).map((order) => order.id) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('주문 읽음 처리 실패', 'admin/orders/read', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
