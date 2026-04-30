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
import { recomputeExpectedAmount } from '@/lib/payment-recompute'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { ADMIN_ALERT_EMAIL } from '@/lib/admin-email'
import { escapeHtml } from '@/lib/html-escape'
import { SITE_URL } from '@/lib/constants'

const ALLOWED_STATUS = new Set(['paid', 'cancelled', 'refunded'])

function formatKRW(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

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

    const { data: orderBefore, error: orderBeforeError } = await supabase
      .from('orders')
      .select('id, user_id, coupon_id, coupon_discount, reward_discount, payment_method, total_amount, status')
      .eq('id', orderId)
      .maybeSingle()

    if (orderBeforeError || !orderBefore) {
      return NextResponse.json({ error: orderBeforeError?.message ?? '주문을 찾을 수 없습니다' }, { status: 404 })
    }

    const beforeStatus = orderBefore.status || 'pending'
    if (beforeStatus === status) {
      return NextResponse.json({ success: true, updates: { status: beforeStatus } })
    }

    if (status === 'paid' && beforeStatus !== 'pending' && beforeStatus !== 'pending_transfer') {
      return NextResponse.json({ error: '결제확인은 대기 상태 주문만 처리할 수 있습니다' }, { status: 409 })
    }

    if (status === 'paid' && beforeStatus !== 'pending_transfer') {
      const { count: itemCount } = await supabase
        .from('order_items')
        .select('*', { count: 'exact', head: true })
        .eq('order_id', orderId)

      if ((itemCount ?? 0) > 0) {
        const expectedAmount = await recomputeExpectedAmount(
          supabase,
          orderId,
          orderBefore.user_id,
          orderBefore.coupon_id,
          Number(orderBefore.reward_discount ?? 0),
        )
        if (expectedAmount === null) {
          logger.error('관리자 주문 결제확인 금액 재계산 실패', 'admin/orders/status', { orderId })
          return NextResponse.json({ error: '주문 금액 재검증에 실패했습니다' }, { status: 500 })
        }
        if (expectedAmount !== Number(orderBefore.total_amount)) {
          logger.error('관리자 주문 결제확인 금액 불일치', 'admin/orders/status', {
            orderId,
            storedTotal: orderBefore.total_amount,
            serverExpected: expectedAmount,
          })
          return NextResponse.json({ error: '주문 금액이 서버 검증 금액과 일치하지 않습니다' }, { status: 400 })
        }
      }
    }

    let couponReservedForPaid = false
    const couponAlreadyReserved = beforeStatus === 'pending_transfer'
    if (status === 'paid' && orderBefore.coupon_id && !couponAlreadyReserved) {
      const { data: couponResult, error: couponErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: orderBefore.coupon_id,
        p_user_id: orderBefore.user_id,
        p_order_id: orderId,
        p_applied_amount: orderBefore.coupon_discount || 0,
      })
      if (couponErr) {
        logger.error('관리자 주문 결제확인 쿠폰 예약 RPC 실패', 'admin/orders/status', {
          orderId,
          couponId: orderBefore.coupon_id,
          error: couponErr.message,
        })
        return NextResponse.json({ error: '쿠폰 사용 예약에 실패했습니다' }, { status: 500 })
      }
      if (couponResult && (couponResult as { ok?: boolean }).ok === false) {
        logger.error('관리자 주문 결제확인 쿠폰 사용 거부', 'admin/orders/status', {
          orderId,
          couponId: orderBefore.coupon_id,
          result: couponResult,
        })
        return NextResponse.json({ error: '쿠폰을 사용할 수 없습니다' }, { status: 409 })
      }
      couponReservedForPaid = true
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
      if (couponReservedForPaid && orderBefore.coupon_id) {
        await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: orderBefore.coupon_id,
          p_user_id: orderBefore.user_id,
          p_order_id: orderId,
        })
      }
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
      try {
        const internalSecret = process.env.CRON_SECRET
        if (!internalSecret) {
          logger.error('관리자 주문 결제확인 이메일 스킵: CRON_SECRET 미설정', 'admin/orders/status', { orderId })
        } else {
          await fetch(`${request.nextUrl.origin}/api/email/order-confirm`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': internalSecret,
            },
            body: JSON.stringify({ orderId }),
          })
        }
      } catch (emailErr) {
        const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
        logger.error('관리자 주문 결제확인 이메일 발송 실패(무시)', 'admin/orders/status', {
          orderId,
          error: message,
        })
      }

      if (beforeStatus === 'pending_transfer') {
        try {
          const { data: mailOrder } = await supabase
            .from('orders')
            .select('id, order_number, user_id, total_amount, deposit_memo')
            .eq('id', orderId)
            .maybeSingle()
          const { data: profile } = mailOrder?.user_id
            ? await supabase
                .from('profiles')
                .select('name, email')
                .eq('id', mailOrder.user_id)
                .maybeSingle()
            : { data: null }
          const orderNumber = mailOrder?.order_number || String(orderId)
          const adminBody = `
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">무통장 입금이 승인되었습니다</h2>
            <p style="margin:0 0 32px;font-size:14px;color:#64748b;">관리자 승인으로 주문 다운로드 권한이 열렸습니다.</p>

            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문번호</td>
                  <td style="font-size:13px;font-weight:600;color:#1e40af;text-align:right;padding-bottom:8px;">${escapeHtml(orderNumber)}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문자</td>
                  <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${escapeHtml(profile?.name || '-')} (${escapeHtml(profile?.email || '-')})</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;padding-bottom:8px;">입금자명</td>
                  <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${escapeHtml(mailOrder?.deposit_memo || orderNumber)}</td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#64748b;">승인금액</td>
                  <td style="font-size:15px;font-weight:700;color:#1e40af;text-align:right;">${formatKRW(Number(mailOrder?.total_amount || 0))}</td>
                </tr>
              </table>
            </div>

            <a href="${SITE_URL}/admin/orders" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
              관리자 주문 확인
            </a>
          `
          await sendEmail(
            ADMIN_ALERT_EMAIL,
            `[프리세일즈 관리자] 입금 승인 완료 - ${orderNumber}`,
            buildEmailHtml('입금 승인 완료', adminBody),
          )
        } catch (approvalMailErr) {
          const message = approvalMailErr instanceof Error ? approvalMailErr.message : '알 수 없는 오류'
          logger.error('관리자 입금 승인 알림 발송 실패(무시)', 'admin/orders/status', {
            orderId,
            error: message,
          })
        }
      }
    }

    if (status === 'cancelled' || status === 'refunded') {
      if (orderBefore.coupon_id) {
        const { error: couponRollbackErr } = await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: orderBefore.coupon_id,
          p_user_id: orderBefore.user_id,
          p_order_id: orderId,
        })
        if (couponRollbackErr) {
          logger.error('관리자 주문 취소/환불 쿠폰 복원 실패', 'admin/orders/status', {
            orderId,
            couponId: orderBefore.coupon_id,
            error: couponRollbackErr.message,
          })
        }
      }
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
