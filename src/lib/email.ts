import nodemailer from 'nodemailer'
import { SITE_URL } from './constants'

// 사용자에게 표시할 "화이트라벨" 도메인 (presales.co.kr 고정)
// 링크 href 는 SITE_URL 을 사용하되, 보이는 텍스트는 presales.co.kr 유지.
// 도메인 연결 전 상태(Vercel preview 도메인) 에서도 동작하도록.
function siteLinkHref(): string {
  return SITE_URL
}

// ===========================
// SMTP Transporter (메일플러그)
// ===========================

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'mail.mailplug.co.kr',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
    auth: {
      user: process.env.SMTP_USER!,
      pass: process.env.SMTP_PASS!,
    },
  })
}

// ===========================
// HTML Email Template
// ===========================

export function buildEmailHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
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
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;">
              <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">본 메일은 발신 전용입니다. 문의는 아래 이메일로 연락 주세요.</p>
              <p style="margin:0;font-size:12px;color:#64748b;">
                <a href="mailto:hojin@amarans.co.kr" style="color:#3b82f6;text-decoration:none;">hojin@amarans.co.kr</a>
                &nbsp;|&nbsp;
                <a href="${siteLinkHref()}" style="color:#3b82f6;text-decoration:none;">presales.co.kr</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#cbd5e1;">&copy; ${new Date().getFullYear()} Amarans. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ===========================
// sendEmail utility
// ===========================

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter()
  await transporter.sendMail({
    from: '"프리세일즈" <hojin@amarans.co.kr>',
    to,
    subject,
    html,
  })
}
