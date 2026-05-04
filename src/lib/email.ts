import nodemailer from 'nodemailer'
import { SITE_URL } from './constants'

// 사용자에게 표시할 "화이트라벨" 도메인 (presales.co.kr 고정)
// 링크 href 는 SITE_URL 을 사용하되, 보이는 텍스트는 presales.co.kr 유지.
// 도메인 연결 전 임시 도메인 상태에서도 동작하도록.
function siteLinkHref(): string {
  return SITE_URL
}

// ===========================
// SMTP Transporter (메일플러그)
// ===========================

const DEFAULT_MAIL_FROM_NAME = '프리세일즈'
const DEFAULT_MAIL_FROM_EMAIL = 'help@amarans.co.kr'

function getMailFrom() {
  return {
    name: process.env.MAIL_FROM_NAME || DEFAULT_MAIL_FROM_NAME,
    address: process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER || DEFAULT_MAIL_FROM_EMAIL,
  }
}

export function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailplug.co.kr',
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
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${title}</title>
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    .presales-mail-header, .presales-mail-header * { color-scheme: light only; }
    .presales-brand-name { color:#ffffff !important; -webkit-text-fill-color:#ffffff !important; }
    .presales-brand-tagline { color:#dbeafe !important; -webkit-text-fill-color:#dbeafe !important; }
    .presales-logo-text { color:#1d4ed8 !important; -webkit-text-fill-color:#1d4ed8 !important; }
  </style>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color-scheme:light only;">
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f7fa" style="background:#f5f7fa;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td class="presales-mail-header" bgcolor="#1e40af" style="background-color:#1e40af;background-image:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td width="44" valign="middle" bgcolor="#ffffff" style="width:44px;height:44px;background-color:#ffffff;border-radius:12px;text-align:center;box-shadow:0 8px 22px rgba(15,23,42,0.18);">
                    <span class="presales-logo-text" style="display:block;font-size:13px;line-height:44px;font-weight:800;letter-spacing:-0.2px;color:#1d4ed8 !important;-webkit-text-fill-color:#1d4ed8 !important;mso-style-textfill-fill-color:#1d4ed8;">PS</span>
                  </td>
                  <td valign="middle" style="padding-left:14px;">
                    <div class="presales-brand-name" style="margin:0;font-size:24px;line-height:1.05;font-weight:800;color:#ffffff !important;-webkit-text-fill-color:#ffffff !important;mso-style-textfill-fill-color:#ffffff;letter-spacing:-0.5px;">PRESALES</div>
                    <div class="presales-brand-tagline" style="margin:6px 0 0;font-size:13px;line-height:1.4;font-weight:600;color:#dbeafe !important;-webkit-text-fill-color:#dbeafe !important;mso-style-textfill-fill-color:#dbeafe;">공공조달 전문 플랫폼</div>
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
                <a href="mailto:help@presales.co.kr" style="color:#3b82f6;text-decoration:none;">help@presales.co.kr</a>
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
    from: getMailFrom(),
    to,
    subject,
    html,
  })
}
