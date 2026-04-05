import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.mailplug.co.kr',
  port: 465,
  secure: true,
  auth: {
    user: 'hojin@amarans.co.kr',
    pass: 'zO(9;NhsAQ*ihG7*EZHW',
  },
})

const htmlBody = process.argv[2] || '<p>내용 없음</p>'
const subject = process.argv[3] || '[시장동향] 뉴스 정리'
const to = process.argv[4] || 'hojin@amarans.co.kr'

const mailOptions = {
  from: '"프리세일즈 미니컴" <hojin@amarans.co.kr>',
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
