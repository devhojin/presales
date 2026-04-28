/**
 * 메일플러그 SMTP 발송 (nodemailer 사용).
 * daily-news.py.send_mail_to_one 포팅.
 */
import nodemailer, { type Transporter } from 'nodemailer'

let _transporter: Transporter | null = null

function getTransporter(): Transporter {
  if (_transporter) return _transporter
  const host = process.env.SMTP_HOST ?? 'smtp.mailplug.co.kr'
  const port = Number(process.env.SMTP_PORT ?? 465)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) throw new Error('SMTP_USER / SMTP_PASS 환경변수 누락')
  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,         // 465 = SSL, 587 = STARTTLS
    auth: { user, pass },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  })
  return _transporter
}

export interface SendOptions {
  to: string
  subject: string
  html: string
  text: string
}

export async function sendBriefMail(opts: SendOptions): Promise<{ messageId: string }> {
  const fromName = process.env.MAIL_FROM_NAME ?? '프리세일즈'
  const fromEmail = process.env.MAIL_FROM_EMAIL ?? process.env.SMTP_USER ?? 'help@amarans.co.kr'
  const t = getTransporter()
  const info = await t.sendMail({
    from: { name: fromName, address: fromEmail },
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
  return { messageId: info.messageId }
}
