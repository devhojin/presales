/**
 * 메일 본문 렌더링 (HTML + 텍스트). daily-news.py.render_html / render_text 포팅.
 */
import type { NewsItem } from './dedup'

interface RenderInput {
  newsByCategory: Record<string, NewsItem[]>
  subscriberToken: string
  topicsLabel: string
  date?: Date
  unsubBaseUrl?: string  // e.g. https://presales.co.kr
}

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function renderHtml({ newsByCategory, subscriberToken, topicsLabel, date, unsubBaseUrl }: RenderInput): string {
  const d = date ?? new Date()
  const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  const base = (unsubBaseUrl ?? 'https://presales.co.kr').replace(/\/+$/, '')

  const sections = Object.entries(newsByCategory)
    .filter(([, items]) => items.length > 0)
    .map(([cat, items]) => {
      const rows = items
        .map(
          (it) => `
        <li style="margin-bottom:12px;">
          <a href="${escHtml(it.link)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-weight:600;">
            ${escHtml(it.title)}
          </a>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">
            ${escHtml(it.source ?? '')} · ${escHtml(it.date ?? '')}
          </div>
        </li>`,
        )
        .join('')
      return `
    <section style="margin-bottom:28px;">
      <h2 style="font-size:16px;font-weight:700;color:#111827;border-left:4px solid #a78bfa;padding-left:10px;margin:0 0 12px;">
        ${escHtml(cat)}
      </h2>
      <ul style="list-style:none;padding:0;margin:0;">
        ${rows}
      </ul>
    </section>`
    })
    .join('')

  const body = sections || '<p>오늘은 수집된 뉴스가 없습니다.</p>'

  return `<!doctype html>
<html lang="ko">
<head><meta charset="utf-8" /></head>
<body style="font-family:'Pretendard','Noto Sans KR',-apple-system,system-ui,sans-serif;background:#f9fafb;padding:24px;margin:0;color:#111827;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;padding:28px 32px;">
    <div style="font-size:24px;font-weight:800;letter-spacing:-0.4px;color:#111827;margin:0 0 12px 0;line-height:1.3;">
      오늘의 모닝 브리프
    </div>
    <p style="font-size:13px;color:#6b7280;margin:0 0 24px 0;padding-bottom:14px;border-bottom:1px solid #e5e7eb;">
      📅 ${dateStr} · 출처: Google News RSS
    </p>
    ${body}
    <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e5e7eb;text-align:center;font-size:11px;color:#9ca3af;line-height:1.6;">
      <p style="margin:0 0 8px;">
        <a href="${base}/brief" style="color:#2563eb;text-decoration:none;font-weight:600;">지난 브리프 보기</a>
        &nbsp;·&nbsp;
        <a href="${base}/brief/unsubscribe?token=${encodeURIComponent(subscriberToken)}" style="color:#9ca3af;text-decoration:underline;">수신거부</a>
      </p>
      수집 키워드: ${escHtml(topicsLabel)}<br />
      아마란스 · help@presales.co.kr
    </div>
  </div>
</body>
</html>`
}

export function renderText({ newsByCategory, date }: RenderInput): string {
  const d = date ?? new Date()
  const dateStr = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
  const lines = [`오늘의 모닝 브리프 - ${dateStr}`, '='.repeat(40), '']
  for (const [cat, items] of Object.entries(newsByCategory)) {
    if (!items.length) continue
    lines.push(`[${cat}]`)
    for (const it of items) {
      lines.push(`- ${it.title}`)
      lines.push(`  ${it.link}`)
    }
    lines.push('')
  }
  lines.push('─'.repeat(40))
  lines.push('아마란스 · help@presales.co.kr')
  return lines.join('\n')
}
