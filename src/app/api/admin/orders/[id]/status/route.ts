import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'
import {
  confirmRewardPoints,
  grantPurchaseRewardForOrder,
  rollbackRewardPoints,
} from '@/lib/reward-points'

const ALLOWED_STATUS = new Set(['paid', 'cancelled', 'refunded'])

export async function PATCH(
  request: NextRequest,
  context: RouteContext<'/api/admin/orders/[id]/status'>,
) {
  try {
    const params = await context.params
    const orderId = Number(params.id)
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return NextResponse.json({ error: '주문 ID가 올바르지 않습니다' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {},
        },
      },
    )

    const { data: { user } } = await supabaseAuth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    const { data: me } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (me?.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
    }

    const body = (await request.json()) as { status?: string }
    const status = String(body.status ?? '')
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: '변경할 수 없는 상태입니다' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, unknown> = { status, updated_at: now }
    if (status === 'paid') updates.paid_at = now
    if (status === 'cancelled') updates.cancelled_at = now
    if (status === 'refunded') updates.refund_reason = '관리자 환불 처리'

    const { data: updated, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)
      .select('id, status')
      .maybeSingle()

    if (error || !updated) {
      return NextResponse.json({ error: error?.message ?? '주문 상태 변경 실패' }, { status: 500 })
    }

    if (status === 'paid') {
      const confirm = await confirmRewardPoints(supabase, orderId)
      if (!confirm.ok) {
        logger.error('관리자 주문 결제확인 적립금 확정 실패', 'admin/orders/status', {
          orderId,
          reason: confirm.reason,
        })
      }
      const grant = await grantPurchaseRewardForOrder(supabase, orderId)
      if (grant.ok === false) {
        logger.error('관리자 주문 결제확인 구매 적립 실패', 'admin/orders/status', {
          orderId,
          reason: grant.reason,
        })
      }
    }

    if (status === 'cancelled' || status === 'refunded') {
      const rollback = await rollbackRewardPoints(supabase, orderId)
      if (!rollback.ok) {
        logger.error('관리자 주문 취소/환불 적립금 복원 실패', 'admin/orders/status', {
          orderId,
          reason: rollback.reason,
        })
      }
    }

    return NextResponse.json({ success: true, updates })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('관리자 주문 상태 변경 API 오류', 'admin/orders/status', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
