import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'
import { SITE_URL } from '@/lib/constants'
import { escapeHtml } from '@/lib/html-escape'

/**
 * Cron handler: 최신 모닝 브리프를 모든 구독자에게 이메일 발송
 * GET /api/cron/send-brief
 * Auth: Bearer token (CRON_SECRET)
 * Schedule: 매일 KST 08:00 = UTC 23:00 (전날)
 */
export async function GET(request: NextRequest) {
  // 1. 인증: CRON_SECRET 헤더 검증
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  try {
    // 2. 오늘 날짜 기준 최신 발행 브리프 1건 조회 (KST 기준 today = UTC yesterday)
    //    Vercel Cron은 UTC 23:00에 실행되므로 KST 날짜 = UTC 날짜 + 1
    const nowUtc = new Date()
    const kstOffsetMs = 9 * 60 * 60 * 1000
    const kstDate = new Date(nowUtc.getTime() + kstOffsetMs)
    const todayKst = kstDate.toISOString().split('T')[0] // "YYYY-MM-DD"

    const { data: brief, error: briefErr } = await supabase
      .from('daily_briefs')
      .select('id, brief_date, slug, subject, email_html, total_news, total_announcements')
      .eq('is_published', true)
      .eq('brief_date', todayKst)
      .maybeSingle()

    if (briefErr) {
      console.error('send-brief: 브리프 조회 오류:', briefErr)
      return NextResponse.json({ success: false, error: briefErr.message }, { status: 500 })
    }

    if (!brief) {
      console.log(`send-brief: ${todayKst} 날짜에 발행된 브리프 없음, 발송 건너뜀`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: `${todayKst} 발행 브리프 없음`,
        timestamp: nowUtc.toISOString(),
      })
    }

    // 이미 발송한 경우 중복 방지 — 원자적 reserve (조건부 update + returning)
    //   수동 재호출·동시 invocation 시에도 한쪽만 발송하도록 sent_at 를 "발송 중" 타임스탬프로 선점
    //   이후 실제 발송 완료 후 동일 타임스탬프 그대로 유지
    const reserveTs = nowUtc.toISOString()
    const { data: reserved, error: reserveErr } = await supabase
      .from('daily_briefs')
      .update({ sent_at: reserveTs })
      .eq('id', brief.id)
      .is('sent_at', null)
      .select('id, sent_at')
      .maybeSingle()

    if (reserveErr) {
      console.error('send-brief: reserve 실패:', reserveErr)
      return NextResponse.json({ success: false, error: reserveErr.message }, { status: 500 })
    }

    if (!reserved) {
      // 이미 다른 invocation이 선점
      const { data: current } = await supabase
        .from('daily_briefs')
        .select('sent_at')
        .eq('id', brief.id)
        .maybeSingle()
      console.log(`send-brief: id=${brief.id} 이미 발송/선점됨 (${current?.sent_at}), 건너뜀`)
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: '이미 발송/선점된 브리프',
        sent_at: current?.sent_at,
        timestamp: nowUtc.toISOString(),
      })
    }

    // 3. 활성 구독자 목록 조회
    const { data: subscribers, error: subsErr } = await supabase
      .from('brief_subscribers')
      .select('id, email, name, token')
      .eq('status', 'active')

    if (subsErr) {
      console.error('send-brief: 구독자 조회 오류:', subsErr)
      return NextResponse.json({ success: false, error: subsErr.message }, { status: 500 })
    }

    const subList = (subscribers ?? []) as Array<{
      id: number
      email: string
      name: string | null
      token: string
    }>

    if (subList.length === 0) {
      console.log('send-brief: 활성 구독자 없음, 발송 건너뜀')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: '활성 구독자 없음',
        timestamp: nowUtc.toISOString(),
      })
    }

    // 4. 이메일 발송
    const briefUrl = `${SITE_URL}/brief/${brief.slug}`
    const subject = `[모닝 브리프] ${brief.subject}`

    let successCount = 0
    let failCount = 0
    const failedEmails: string[] = []

    for (const sub of subList) {
      const unsubscribeUrl = `${SITE_URL}/api/brief/unsubscribe?token=${sub.token}`
      const html = buildBriefEmailHtml({
        subject: brief.subject,
        briefDate: brief.brief_date,
        emailHtml: brief.email_html,
        totalNews: brief.total_news,
        totalAnnouncements: brief.total_announcements,
        briefUrl,
        unsubscribeUrl,
        recipientName: sub.name,
      })

      try {
        await sendEmail(sub.email, subject, html)
        successCount++
      } catch (e) {
        // PII 로그 유출 방지 — 이메일은 도메인만 로그, 전체는 서버사이드 failedEmails 배열에만
        const mask = sub.email.includes('@') ? `***@${sub.email.split('@')[1]}` : '***'
        console.error(`send-brief: 발송 실패 [${mask}]:`, e instanceof Error ? e.message : e)
        failCount++
        failedEmails.push(sub.email)
      }
    }

    // 5. 발송 완료 — 선점 타임스탬프 그대로 유지 (reserve 단계에서 이미 기록됨)
    //    successCount === 0 (전건 실패) 인 경우만 sent_at 되돌려 재시도 가능하게
    if (successCount === 0 && failCount > 0) {
      const { error: revertErr } = await supabase
        .from('daily_briefs')
        .update({ sent_at: null })
        .eq('id', brief.id)
        .eq('sent_at', reserveTs) // 이 invocation의 reserve 만 되돌림
      if (revertErr) {
        console.error('send-brief: 전건 실패 후 sent_at revert 실패:', revertErr)
      }
    }

    console.log(`send-brief: 완료 — 성공 ${successCount}건, 실패 ${failCount}건`)

    // 응답에는 실패 이메일 주소 제외 (CRON_SECRET 유출 시 구독자 PII 노출 방지)
    // 상세 실패 목록은 서버 로그에서만 확인
    if (failedEmails.length > 0) {
      console.error(`send-brief: 실패 ${failedEmails.length}건 (상세 주소는 서버 로그 감사로만)`)
    }
    return NextResponse.json({
      success: true,
      briefId: brief.id,
      briefDate: brief.brief_date,
      subject: brief.subject,
      totalSubscribers: subList.length,
      successCount,
      failCount,
      timestamp: nowUtc.toISOString(),
    })
  } catch (e: unknown) {
    console.error('send-brief: 처리 중 예외 발생:', e)
    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : '알 수 없는 오류',
      },
      { status: 500 },
    )
  }
}

// ===========================
// 브리프 전용 이메일 HTML 생성
// ===========================

interface BriefEmailOptions {
  subject: string
  briefDate: string
  emailHtml: string
  totalNews: number
  totalAnnouncements: number
  briefUrl: string
  unsubscribeUrl: string
  recipientName: string | null
}

function buildBriefEmailHtml(opts: BriefEmailOptions): string {
  const {
    subject,
    briefDate,
    emailHtml,
    totalNews,
    totalAnnouncements,
    briefUrl,
    unsubscribeUrl,
    recipientName,
  } = opts

  const dateLabel = new Date(briefDate).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    timeZone: 'Asia/Seoul',
  })

  const greeting = recipientName
    ? `안녕하세요, ${escapeHtml(recipientName)}님!`
    : '안녕하세요!'

  const statsBadges = [
    `<span style="display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:9999px;padding:3px 12px;font-size:12px;font-weight:600;margin-right:6px;">뉴스 ${totalNews}건</span>`,
    totalAnnouncements > 0
      ? `<span style="display:inline-block;background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;border-radius:9999px;padding:3px 12px;font-size:12px;font-weight:600;">공고 ${totalAnnouncements}건</span>`
      : '',
  ].join('')

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">PRESALES</span>
                    <span style="font-size:12px;color:rgba(255,255,255,0.7);margin-left:8px;">공공조달 전문 플랫폼</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.15);border-radius:6px;padding:4px 10px;">모닝 브리프</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Date & Title -->
          <tr>
            <td style="padding:28px 40px 0;">
              <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">${dateLabel}</p>
              <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#0f172a;line-height:1.35;">${subject}</h1>
              <div style="margin-bottom:20px;">${statsBadges}</div>
              <p style="margin:0 0 4px;font-size:14px;color:#475569;">${greeting}</p>
              <p style="margin:0 0 0;font-size:14px;color:#475569;line-height:1.6;">
                오늘의 공공조달·시장동향 브리프입니다. 아래에서 주요 뉴스와 공고를 확인하세요.
              </p>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 0;" />
            </td>
          </tr>

          <!-- Brief Body (DB에 저장된 이메일 HTML 그대로 삽입) -->
          <tr>
            <td style="padding:0 0 8px;">
              ${emailHtml}
            </td>
          </tr>

          <!-- CTA: 웹에서 보기 -->
          <tr>
            <td style="padding:16px 40px 28px;">
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 20px;" />
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <a href="${briefUrl}"
                       style="display:inline-block;background:#1e40af;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 22px;border-radius:8px;">
                      웹에서 보기
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">본 메일은 모닝 브리프 구독자에게 발송됩니다.</p>
              <p style="margin:0 0 8px;font-size:12px;color:#64748b;">
                <a href="mailto:help@presales.co.kr" style="color:#3b82f6;text-decoration:none;">help@presales.co.kr</a>
                &nbsp;|&nbsp;
                <a href="${SITE_URL}" style="color:#3b82f6;text-decoration:none;">presales.co.kr</a>
              </p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">
                <a href="${unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline;">구독 취소</a>
                &nbsp;&nbsp;&copy; ${new Date().getFullYear()} Amarans. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
