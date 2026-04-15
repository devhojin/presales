import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, buildEmailHtml } from '@/lib/email'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { email: string }
    const { email } = body

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // service role로 복구 링크 생성
    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
    })

    if (linkError || !data?.properties?.action_link) {
      // 보안상 존재 여부를 노출하지 않고 성공처럼 응답
      logger.error('비밀번호 재설정 링크 생성 오류', 'auth/reset-password', {
        error: linkError?.message ?? 'action_link missing',
      })
      return NextResponse.json({ success: true })
    }

    const resetUrl = data.properties.action_link

    const bodyHtml = `
      <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">비밀번호 재설정 요청</h2>
      <p style="margin:0 0 32px;font-size:14px;color:#64748b;">
        프리세일즈 비밀번호 재설정 요청이 접수되었습니다.<br/>
        아래 버튼을 클릭하여 새 비밀번호를 설정하세요.
      </p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:13px;color:#1e40af;font-weight:600;">안내사항</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#3b82f6;line-height:1.8;">
          <li>링크는 <strong>1시간</strong> 동안만 유효합니다.</li>
          <li>본인이 요청하지 않은 경우 이 메일을 무시하세요.</li>
          <li>계정 보안에 문제가 있다면 <a href="mailto:hojin@amarans.co.kr" style="color:#1e40af;">hojin@amarans.co.kr</a>로 연락해주세요.</li>
        </ul>
      </div>

      <a href="${resetUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;">
        비밀번호 재설정하기
      </a>

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">
        버튼이 작동하지 않으면 아래 링크를 복사해 브라우저에 붙여넣으세요.<br/>
        <span style="color:#64748b;word-break:break-all;">${resetUrl}</span>
      </p>
    `

    await sendEmail(
      email,
      '[프리세일즈] 비밀번호 재설정 링크',
      buildEmailHtml('비밀번호 재설정', bodyHtml),
    )

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('비밀번호 재설정 이메일 발송 오류', 'auth/reset-password', { error: message })
    // 보안상 내부 오류를 외부에 노출하지 않음
    return NextResponse.json({ success: true })
  }
}
