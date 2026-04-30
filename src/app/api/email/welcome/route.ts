import { NextRequest, NextResponse } from 'next/server'
import { headers, cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { SITE_URL } from '@/lib/constants'
import { escapeHtml } from '@/lib/html-escape'

export async function POST(request: NextRequest) {
  try {
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`email:${ip}`, 5, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

    // 인증: 로그인 유저가 자기 이메일로만 환영 메일 요청 가능 (스팸 발송 악용 방지)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const body = await request.json() as { email: string; name: string }
    const { email, name } = body

    if (!email || !name) {
      return NextResponse.json({ error: 'email and name are required' }, { status: 400 })
    }

    // 본인 이메일로만 발송 허용
    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: '본인 이메일로만 요청 가능합니다' }, { status: 403 })
    }

    const displayName = escapeHtml(name || '회원')

    const bodyHtml = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">프리세일즈에 오신 것을 환영합니다!</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">${displayName}님, 회원가입을 축하드립니다.<br/>공공조달 전문 플랫폼 프리세일즈와 함께 제안서 경쟁력을 높이세요.</p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e40af;">프리세일즈로 할 수 있는 것들</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#2563eb;border-radius:6px;text-align:center;line-height:24px;font-size:12px;color:#fff;font-weight:700;">1</span>
            </td>
            <td style="padding:8px 0 8px 8px;vertical-align:top;">
              <strong style="font-size:13px;color:#1e3a8a;">스토어 — 제안서 문서 구매</strong>
              <p style="margin:2px 0 0;font-size:12px;color:#3b82f6;">실전 공공조달 제안서, 기술 문서, 입찰 가이드를 즉시 다운로드</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#2563eb;border-radius:6px;text-align:center;line-height:24px;font-size:12px;color:#fff;font-weight:700;">2</span>
            </td>
            <td style="padding:8px 0 8px 8px;vertical-align:top;">
              <strong style="font-size:13px;color:#1e3a8a;">무료 자료 — 공공조달 가이드</strong>
              <p style="margin:2px 0 0;font-size:12px;color:#3b82f6;">공지사항, 피드를 통해 최신 조달 정보와 무료 자료 열람</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:32px;">
              <span style="display:inline-block;width:24px;height:24px;background:#2563eb;border-radius:6px;text-align:center;line-height:24px;font-size:12px;color:#fff;font-weight:700;">3</span>
            </td>
            <td style="padding:8px 0 8px 8px;vertical-align:top;">
              <strong style="font-size:13px;color:#1e3a8a;">컨설팅 — 전문가 1:1 제안서 리뷰</strong>
              <p style="margin:2px 0 0;font-size:12px;color:#3b82f6;">스팟 상담부터 프로젝트 컨설팅까지, 맞춤 전문가 지원</p>
            </td>
          </tr>
        </table>
      </div>

      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">가입 축하 혜택</p>
        <p style="margin:4px 0 0;font-size:13px;color:#166534;">회원가입 축하 <strong>1만원 쿠폰</strong>이 나의콘솔에 자동 지급되었습니다.</p>
      </div>

      <table cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-right:8px;">
            <a href="${SITE_URL}/store" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
              스토어 둘러보기
            </a>
          </td>
          <td>
            <a href="${SITE_URL}/mypage" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">
              나의콘솔 바로가기
            </a>
          </td>
        </tr>
      </table>
    `

    await sendEmail(
      email,
      '[프리세일즈] 회원가입을 환영합니다!',
      buildEmailHtml('환영합니다', bodyHtml),
    )

    return NextResponse.json({ success: true, message: '환영 이메일 발송 완료' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('환영 이메일 발송 오류', 'email/welcome', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
