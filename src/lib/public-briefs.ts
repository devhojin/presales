export interface MorningBriefRow {
  id: string
  brief_date: string
  subject: string | null
  html_body: string | null
  news_count: number | null
  started_at: string | null
  finished_at: string | null
}

export interface PublicBrief {
  id: string
  brief_date: string
  slug: string
  subject: string
  email_html: string
  total_news: number
  total_announcements: number
  created_at: string
  sent_at: string | null
}

const DATE_PATTERN = /^(\d{4}-\d{2}-\d{2})$/
const SLUG_DATE_PATTERN = /(\d{4}-\d{2}-\d{2})$/

export function morningBriefSlug(briefDate: string): string {
  return `morning-brief-${briefDate}`
}

export function parseMorningBriefDateFromSlug(slug: string): string | null {
  const direct = DATE_PATTERN.exec(slug)
  if (direct) return direct[1]

  const match = SLUG_DATE_PATTERN.exec(slug)
  return match ? match[1] : null
}

export function toPublicBrief(row: MorningBriefRow): PublicBrief {
  const createdAt = row.started_at ?? row.finished_at ?? `${row.brief_date}T00:00:00+09:00`

  return {
    id: row.id,
    brief_date: row.brief_date,
    slug: morningBriefSlug(row.brief_date),
    subject: row.subject ?? `오늘의 모닝 브리프 - ${row.brief_date}`,
    email_html: row.html_body ?? '',
    total_news: row.news_count ?? 0,
    total_announcements: 0,
    created_at: createdAt,
    sent_at: row.finished_at,
  }
}
