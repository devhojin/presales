import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { logger } from '@/lib/logger'
import { SITE_URL } from '@/lib/constants'
import { escapeHtml } from '@/lib/html-escape'
import { recomputeExpectedAmount } from '@/lib/payment-recompute'
import { reserveRewardPoints, rollbackRewardPoints } from '@/lib/reward-points'
import { ADMIN_ALERT_EMAIL } from '@/lib/admin-email'
import { buildOrderItemRows, type OrderEmailItem } from '@/lib/order-email'

// 입금 계좌 정보 (환경변수 우선, 미설정 시 기본값)
// 운영 환경변수에서 값 변경 가능
const BANK_ACCOUNT = {
  bank: process.env.BANK_NAME || '기업은행',
  account: process.env.BANK_ACCOUNT_NUMBER || '394-056559-01-013',
  holder: process.env.BANK_HOLDER || '(주)아마란스',
}

function formatKRW(amount: number) {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

function formatDateKR(isoString: string) {
  const d = new Date(isoString)
  return d.toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export async function POST(request: NextRequest) {
  try {
    // 1. 인증 확인
    const cookieStore = await cookies()
    const supabaseAuth = createServerClient(
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

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
    }

    // 2. 요청 바디
    const body = await request.json()
    const { orderId } = body as { orderId: number }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId는 필수입니다' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 3. 주문 소유권 + 상태 확인
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        user_id,
        status,
        total_amount,
        coupon_id,
        coupon_discount,
        reward_discount,
        deposit_memo,
        order_items (
          id,
          product_id,
          price,
          products ( title )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다' }, { status: 404 })
    }
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }
    if (order.status !== 'pending') {
      return NextResponse.json({ error: '이미 처리된 주문입니다' }, { status: 409 })
    }

    // 3-1. 서버 사이드 금액 재검증 (Round 5 동일 클래스).
    //   orders.total_amount / order_items.price 는 클라 INSERT 값이라 신뢰 못 함.
    //   products.price + 번들/쿠폰 규칙 재실행해서 일치 여부 검증.
    //   불일치 시 입금 안내 자체를 거부 — 상품보다 적게 입금 → 관리자가 실수로 승인하는 시나리오 차단.
    const expectedAmount = await recomputeExpectedAmount(
      supabase,
      orderId,
      user.id,
      order.coupon_id as string | null,
      Number(order.reward_discount ?? 0),
    )
    if (expectedAmount === null) {
      logger.error('무통장 주문 재계산 실패', 'payment/bank-transfer', { orderId })
      return NextResponse.json({ error: '주문 금액 재검증에 실패했습니다' }, { status: 500 })
    }
    if (expectedAmount !== Number(order.total_amount)) {
      logger.error('무통장 서버 재계산 금액 불일치 (가격 조작 의심)', 'payment/bank-transfer', {
        orderId,
        userId: user.id,
        storedTotal: order.total_amount,
        serverExpected: expectedAmount,
      })
      return NextResponse.json(
        { error: '주문 금액이 서버 검증 금액과 일치하지 않습니다. 장바구니에서 다시 진행해주세요.' },
        { status: 400 },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('id', order.user_id)
      .maybeSingle()

    let couponReserved = false
    if (order.coupon_id) {
      const { data: couponResult, error: couponErr } = await supabase.rpc('increment_coupon_usage', {
        p_coupon_id: order.coupon_id,
        p_user_id: user.id,
        p_order_id: orderId,
        p_applied_amount: order.coupon_discount || 0,
      })
      if (couponErr) {
        logger.error('무통장 쿠폰 예약 RPC 실패', 'payment/bank-transfer', {
          orderId,
          couponId: order.coupon_id,
          error: couponErr.message,
        })
        return NextResponse.json({ error: '쿠폰 사용 예약에 실패했습니다' }, { status: 500 })
      }
      if (couponResult && (couponResult as { ok?: boolean }).ok === false) {
        logger.error('무통장 쿠폰 사용 거부', 'payment/bank-transfer', {
          orderId,
          couponId: order.coupon_id,
          result: couponResult,
        })
        return NextResponse.json({ error: '쿠폰을 사용할 수 없습니다' }, { status: 409 })
      }
      couponReserved = true
    }

    const rewardDiscount = Math.max(0, Number(order.reward_discount ?? 0))
    let rewardReserved = false
    if (rewardDiscount > 0) {
      const reserve = await reserveRewardPoints(supabase, user.id, orderId, rewardDiscount)
      if (!reserve.ok) {
        if (couponReserved && order.coupon_id) {
          await supabase.rpc('rollback_coupon_usage', {
            p_coupon_id: order.coupon_id,
            p_user_id: user.id,
            p_order_id: orderId,
          })
        }
        logger.error('무통장 적립금 예약 실패', 'payment/bank-transfer', {
          orderId,
          reason: reserve.reason,
        })
        return NextResponse.json({ error: '적립금을 사용할 수 없습니다' }, { status: 409 })
      }
      rewardReserved = true
    }

    // 4. 주문 상태를 pending_transfer로 변경
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: 'pending_transfer',
        payment_method: 'bank_transfer',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('status', 'pending')

    if (updateError) {
      if (couponReserved && order.coupon_id) {
        await supabase.rpc('rollback_coupon_usage', {
          p_coupon_id: order.coupon_id,
          p_user_id: user.id,
          p_order_id: orderId,
        })
      }
      if (rewardReserved) await rollbackRewardPoints(supabase, orderId)
      logger.error('무통장 주문 상태 변경 실패', 'payment/bank-transfer', { error: updateError.message })
      return NextResponse.json({ error: '주문 상태 변경에 실패했습니다' }, { status: 500 })
    }

    const items = order.order_items as unknown as OrderEmailItem[]

    // 5. 입금 안내 이메일 발송 (실패해도 API는 성공 반환)
    if (profile?.email) {
      try {
        const itemRows = buildOrderItemRows(items, formatKRW)

        const depositMemo = order.deposit_memo || order.order_number
        const safeDepositMemo = escapeHtml(depositMemo)
        const safeOrderNumber = escapeHtml(order.order_number)
        const safeCustomerName = escapeHtml(profile.name || '고객')
        const safeCustomerEmail = escapeHtml(profile.email)

        // 고객 이메일
        const customerBody = `
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">무통장 입금 안내</h2>
          <p style="margin:0 0 32px;font-size:14px;color:#64748b;">${safeCustomerName}님, 아래 계좌로 입금해 주시면 관리자 승인 후 다운로드가 가능합니다.</p>

          <div style="background:#eff6ff;border:2px solid #bfdbfe;border-radius:8px;padding:24px;margin-bottom:24px;">
            <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1e40af;">입금 계좌 정보</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px;width:80px;">은행</td>
                <td style="font-size:15px;font-weight:700;color:#0f172a;padding-bottom:10px;">${BANK_ACCOUNT.bank}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px;">계좌번호</td>
                <td style="font-size:15px;font-weight:700;color:#0f172a;padding-bottom:10px;">${BANK_ACCOUNT.account}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:10px;">예금주</td>
                <td style="font-size:15px;font-weight:700;color:#0f172a;padding-bottom:10px;">${BANK_ACCOUNT.holder}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;">입금금액</td>
                <td style="font-size:18px;font-weight:800;color:#1e40af;">${formatKRW(order.total_amount)}</td>
              </tr>
            </table>
          </div>

          <div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#92400e;">입금자명 안내</p>
            <p style="margin:0;font-size:13px;color:#78350f;">
              입금 시 입금자명에 <strong>${safeDepositMemo}</strong>를 기재해 주시면 빠른 확인이 가능합니다.
            </p>
          </div>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <h3 style="margin:0 0 12px;font-size:14px;font-weight:600;color:#334155;">주문 정보</h3>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:6px;">주문번호</td>
                <td style="font-size:13px;font-weight:600;color:#1e40af;text-align:right;padding-bottom:6px;">${safeOrderNumber}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;">주문일시</td>
                <td style="font-size:13px;color:#334155;text-align:right;">${formatDateKR(new Date().toISOString())}</td>
              </tr>
            </table>
          </div>

          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#334155;">주문 상품</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;">상품명</th>
                <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;">금액</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
            <tfoot>
              <tr style="background:#f8fafc;">
                <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#0f172a;">합계</td>
                <td style="padding:14px 16px;font-size:15px;font-weight:700;color:#1e40af;text-align:right;">${formatKRW(order.total_amount)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
            <p style="margin:0;font-size:13px;color:#15803d;">
              관리자가 입금 확인 후 승인하면 <strong>나의콘솔 &gt; 주문내역</strong>에서 문서를 다운로드하실 수 있습니다.
            </p>
          </div>

          <p style="margin:0 0 16px;font-size:13px;color:#64748b;">입금 후 빠른 확인을 원하시면 우측 하단 채널톡으로 문의해 주세요.</p>

          <a href="${SITE_URL}/mypage" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            나의콘솔 바로가기
          </a>
        `

        await sendEmail(
          profile.email,
          `[프리세일즈] 무통장 입금 안내 - ${order.order_number} (${formatKRW(order.total_amount)})`,
          buildEmailHtml('무통장 입금 안내', customerBody),
        )

        // 관리자 알림
        const adminBody = `
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">무통장 입금 주문 접수</h2>
          <p style="margin:0 0 32px;font-size:14px;color:#64748b;">입금 확인 후 관리자 주문 목록에서 '입금 승인'을 눌러 다운로드 권한을 열어주세요.</p>

          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문번호</td>
                <td style="font-size:13px;font-weight:600;color:#1e40af;text-align:right;padding-bottom:8px;">${safeOrderNumber}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문자</td>
                <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${escapeHtml(profile.name || '-')} (${safeCustomerEmail})</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;padding-bottom:8px;">입금자명</td>
                <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${safeDepositMemo}</td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#64748b;">결제금액</td>
                <td style="font-size:15px;font-weight:700;color:#1e40af;text-align:right;">${formatKRW(order.total_amount)}</td>
              </tr>
            </table>
          </div>

          <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#334155;">주문 상품</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f8fafc;">
                <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-align:left;border-bottom:1px solid #e2e8f0;">상품명</th>
                <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#64748b;text-align:right;border-bottom:1px solid #e2e8f0;">금액</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <a href="${SITE_URL}/admin/orders" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
            관리자 주문 확인
          </a>
        `

        await sendEmail(
          ADMIN_ALERT_EMAIL,
          `[프리세일즈 관리자] 무통장 입금 대기 - ${order.order_number} (${formatKRW(order.total_amount)})`,
          buildEmailHtml('무통장 입금 주문', adminBody),
        )
      } catch (emailErr) {
        const message = emailErr instanceof Error ? emailErr.message : '알 수 없는 오류'
        logger.error('무통장 입금 안내 이메일 발송 실패', 'payment/bank-transfer', { error: message })
        // 이메일 실패는 무시 — 주문은 이미 생성됨
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber: order.order_number,
      totalAmount: order.total_amount,
      bankAccount: BANK_ACCOUNT,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('무통장 입금 API 오류', 'payment/bank-transfer', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
