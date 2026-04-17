import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { logger } from '@/lib/logger'
import { checkRateLimitAsync } from '@/lib/rate-limit'

import { CONSULTING_PACKAGES } from '@/lib/constants'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@amarans.co.kr'

// lib/constants.ts 의 CONSULTING_PACKAGES 를 단일 진실 공급원으로 사용
const PACKAGE_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(CONSULTING_PACKAGES).map((p) => [p.value, `${p.name} (${p.priceLabel})`])
)

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

/** HTML 특수문자 이스케이프 (이메일 본문 XSS 차단) */
function escapeHtml(s: string | null | undefined): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
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

    // 인증 확인
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

    const body = await request.json()
    const { consultingRequestId } = body as { consultingRequestId: number }

    if (!consultingRequestId) {
      return NextResponse.json({ error: 'consultingRequestId is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // 컨설팅 문의 정보 조회
    const { data: req, error: reqErr } = await supabase
      .from('consulting_requests')
      .select('id, name, email, phone, company, package_type, message, status, created_at')
      .eq('id', consultingRequestId)
      .single()

    if (reqErr || !req) {
      return NextResponse.json({ error: '문의를 찾을 수 없습니다.' }, { status: 404 })
    }

    // 소유권 확인: 본인 문의 또는 관리자만 허용
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdmin = userProfile?.role === 'admin'
    const { data: reqOwner } = await supabase
      .from('consulting_requests')
      .select('user_id')
      .eq('id', consultingRequestId)
      .single()
    if (!isAdmin && reqOwner?.user_id !== user.id) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    if (!req.email) {
      return NextResponse.json({ error: '신청자 이메일이 없습니다.' }, { status: 400 })
    }

    const packageLabel = PACKAGE_LABELS[req.package_type] || req.package_type

    // ===========================
    // 신청자에게 접수 확인 이메일
    // ===========================
    const applicantBody = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">컨설팅 문의가 접수되었습니다</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">${escapeHtml(req.name)}님, 문의해 주셔서 감사합니다. 24시간 이내에 담당자가 연락드리겠습니다.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;width:100px;">신청자</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;font-weight:500;">${escapeHtml(req.name)}</td>
          </tr>
          ${req.company ? `
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">회사명</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${escapeHtml(req.company)}</td>
          </tr>` : ''}
          ${req.phone ? `
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">연락처</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${escapeHtml(req.phone)}</td>
          </tr>` : ''}
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">요금 방식</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;font-weight:500;">${escapeHtml(packageLabel)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">접수 일시</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${formatDateKR(req.created_at)}</td>
          </tr>
          ${req.message ? `
          <tr>
            <td style="font-size:13px;color:#64748b;vertical-align:top;">문의 내용</td>
            <td style="font-size:13px;color:#334155;line-height:1.6;">${escapeHtml(req.message).replace(/\n/g, '<br/>')}</td>
          </tr>` : ''}
        </table>
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:13px;color:#1e40af;font-weight:600;">안내사항</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#3b82f6;line-height:1.8;">
          <li>접수 후 24시간 이내에 담당자가 연락드립니다.</li>
          <li>추가 문의: <a href="mailto:hojin@amarans.co.kr" style="color:#1e40af;">hojin@amarans.co.kr</a></li>
        </ul>
      </div>

      <a href="https://presales.co.kr/consulting" style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        컨설팅 페이지 보기
      </a>
    `

    await sendEmail(
      req.email,
      '[프리세일즈] 컨설팅 문의가 접수되었습니다',
      buildEmailHtml('컨설팅 접수 확인', applicantBody),
    )

    // ===========================
    // 관리자에게 새 문의 알림
    // ===========================
    const adminBody = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">새 컨설팅 문의가 접수되었습니다</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">새로운 컨설팅 문의를 확인하고 24시간 이내에 연락하세요.</p>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;width:100px;">신청자</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;font-weight:600;">${escapeHtml(req.name)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">이메일</td>
            <td style="font-size:13px;padding-bottom:10px;">
              <a href="mailto:${encodeURIComponent(req.email)}" style="color:#1e40af;text-decoration:none;">${escapeHtml(req.email)}</a>
            </td>
          </tr>
          ${req.phone ? `
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">연락처</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${escapeHtml(req.phone)}</td>
          </tr>` : ''}
          ${req.company ? `
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">회사명</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${escapeHtml(req.company)}</td>
          </tr>` : ''}
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">요금 방식</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;font-weight:500;">${escapeHtml(packageLabel)}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#64748b;padding-bottom:10px;vertical-align:top;">접수 일시</td>
            <td style="font-size:13px;color:#334155;padding-bottom:10px;">${formatDateKR(req.created_at)}</td>
          </tr>
          ${req.message ? `
          <tr>
            <td style="font-size:13px;color:#64748b;vertical-align:top;">문의 내용</td>
            <td style="font-size:13px;color:#334155;line-height:1.6;">${escapeHtml(req.message).replace(/\n/g, '<br/>')}</td>
          </tr>` : ''}
        </table>
      </div>

      <a href="https://presales.co.kr/admin/consulting" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;">
        관리자 컨설팅 확인
      </a>
    `

    await sendEmail(
      ADMIN_EMAIL,
      `[프리세일즈 관리자] 새 컨설팅 문의 - ${req.name?.replace(/[\r\n]/g, '') ?? ''} (${packageLabel.split(' ')[0]})`,
      buildEmailHtml('새 컨설팅 문의', adminBody),
    )

    return NextResponse.json({ success: true, message: '이메일 발송 완료' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('컨설팅 문의 이메일 발송 오류', 'email/consulting', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
