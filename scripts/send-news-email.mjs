import nodemailer from 'nodemailer'
import { existsSync, readFileSync } from 'node:fs'

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const separator = trimmed.indexOf('=')
    if (separator < 0) continue
    const key = trimmed.slice(0, separator)
    let value = trimmed.slice(separator + 1)
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] ||= value
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env.production.local')

const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS

if (!smtpUser || !smtpPass) {
  throw new Error('SMTP_USER / SMTP_PASS 환경변수가 필요합니다.')
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailplug.co.kr',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
})

const htmlBody = process.argv[2] || '<p>내용 없음</p>'
const subject = process.argv[3] || '[시장동향] 뉴스 정리'
const to = process.argv[4] || process.env.ADMIN_EMAIL || 'help@amarans.co.kr'

const mailOptions = {
  from: {
    name: process.env.MAIL_FROM_NAME || '프리세일즈',
    address: process.env.MAIL_FROM_EMAIL || smtpUser,
  },
  to,
  subject,
  html: htmlBody,
}

try {
  const info = await transporter.sendMail(mailOptions)
  console.log('✅ 이메일 발송 완료:', info.messageId)
} catch (err) {
  console.error('❌ 발송 실패:', err.message)
}
