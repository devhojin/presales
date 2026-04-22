import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { SITE_URL } from '@/lib/constants'

const ADMIN_EMAIL = 'admin@amarans.co.kr'

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
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for') ?? 'unknown'
    const rl = await checkRateLimitAsync(`email:${ip}`, 5, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

    // Internal call 우회: toss webhook / bank-transfer 처럼 쿠키 없이 호출되는
    // 내부 트리거는 CRON_SECRET 을 X-Internal-Secret 로 전달해 인증을 우회한다.
    const internalSecret = headersList.get('x-internal-secret')
    const cronSecret = process.env.CRON_SECRET
    const isInternalCall = !!(cronSecret && internalSecret && internalSecret === cronSecret)

    let callerUserId: string | null = null
    if (!isInternalCall) {
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
      callerUserId = user.id
    }

    const body = await request.json()
    const { orderId } = body as { orderId: number }

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 주문 정보 조회
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        payment_method,
        created_at,
        profiles ( name, email ),
        order_items (
          id,
          price,
          products ( title )
        )
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 소유권 확인: 본인 주문 또는 관리자만 허용 (internal call 은 검증된 토큰으로 우회)
    if (!isInternalCall && callerUserId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role, user_id:id')
        .eq('id', callerUserId)
        .single()
      const isAdmin = userProfile?.role === 'admin'
      const { data: orderOwner } = await supabase
        .from('orders')
        .select('user_id')
        .eq('id', orderId)
        .single()
      if (!isAdmin && orderOwner?.user_id !== callerUserId) {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
      }
    }

    const profile = order.profiles as unknown as { name: string | null; email: string } | null
    if (!profile?.email) {
      return NextResponse.json({ error: '주문자 이메일이 없습니다.' }, { status: 400 })
    }

    const items = (order.order_items as unknown as { id: string; price: number; products: { title: string } | null }[]) || []

    // ===========================
    // 주문자에게 주문 확인 이메일
    // ===========================
    const itemRows = items
      .map(
        (item) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">
            ${item.products?.title || '(상품명 없음)'}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;white-space:nowrap;">
            ${formatKRW(item.price)}
          </td>
        </tr>`,
      )
      .join('')

    const customerBody = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">주문이 확인되었습니다</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">${profile.name || '고객'}님, 주문해 주셔서 감사합니다.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문번호</td>
            <td style="font-size:13px;font-weight:600;color:#1e40af;text-align:right;padding-bottom:8px;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문일시</td>
            <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${formatDateKR(order.created_at)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;">결제 상태</td>
            <td style="font-size:13px;color:#334155;text-align:right;">
              <span style="background:#dcfce7;color:#16a34a;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;">결제완료</span>
            </td>
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

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#1e40af;">
          구매하신 문서는 <strong>나의콘솔 &gt; 주문내역</strong>에서 다운로드하실 수 있습니다.
        </p>
      </div>

      <a href="${SITE_URL}/mypage" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        나의콘솔 바로가기
      </a>
    `

    await sendEmail(
      profile.email,
      `[프리세일즈] 주문 확인 - ${order.order_number}`,
      buildEmailHtml('주문 확인', customerBody),
    )

    // ===========================
    // 관리자에게 새 주문 알림
    // ===========================
    const adminBody = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">새 주문이 접수되었습니다</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">새로운 결제 완료 주문을 확인하세요.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문번호</td>
            <td style="font-size:13px;font-weight:600;color:#1e40af;text-align:right;padding-bottom:8px;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문자</td>
            <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${profile.name || '-'} (${profile.email})</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:8px;">주문일시</td>
            <td style="font-size:13px;color:#334155;text-align:right;padding-bottom:8px;">${formatDateKR(order.created_at)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;">결제금액</td>
            <td style="font-size:15px;font-weight:700;color:#1e40af;text-align:right;">${formatKRW(order.total_amount)}</td>
          </tr>
        </table>
      </div>

      <h3 style="margin:0 0 12px;font-size:15px;font-weight:600;color:#334155;">주문 상품 목록</h3>
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
      ADMIN_EMAIL,
      `[프리세일즈 관리자] 새 주문 - ${order.order_number} (${formatKRW(order.total_amount)})`,
      buildEmailHtml('새 주문 알림', adminBody),
    )

    return NextResponse.json({ success: true, message: '이메일 발송 완료' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('주문 확인 이메일 발송 오류', 'email/order-confirm', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
