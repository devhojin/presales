import { createServerClient } from '@supabase/ssr'
import { parseMorningBriefDateFromSlug, type PublicBrief } from '@/lib/public-briefs'

interface LegacyDailyBriefRow {
  id: number
  brief_date: string
  slug: string
  subject: string
  email_html: string
  total_news: number
  total_announcements: number
  created_at: string
  sent_at: string | null
}

type CentralBriefsResponse =
  | { ok: true; briefs: PublicBrief[] }
  | { ok: false; error?: string }

function centralBriefBaseUrl(): string {
  return (
    process.env.MORNING_BRIEF_PUBLIC_URL ||
    process.env.MORNING_BRIEF_API_URL ||
    'https://morning-brief-murex.vercel.app'
  ).replace(/\/+$/, '')
}

function legacySupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  return createServerClient(
    url,
    key,
    { cookies: { getAll() { return [] } } },
  )
}

function toLegacyPublicBrief(row: LegacyDailyBriefRow): PublicBrief {
  return {
    id: `legacy-${row.id}`,
    brief_date: row.brief_date,
    slug: row.slug,
    subject: row.subject,
    email_html: row.email_html,
    total_news: row.total_news,
    total_announcements: row.total_announcements,
    created_at: row.created_at,
    sent_at: row.sent_at,
  }
}

async function fetchCentralBriefs(limit: number, briefDate?: string): Promise<PublicBrief[]> {
  const params = new URLSearchParams({
    type: 'public_procurement_daily',
    limit: String(limit),
  })
  if (briefDate) params.set('date', briefDate)

  try {
    const res = await fetch(`${centralBriefBaseUrl()}/api/v1/briefs?${params.toString()}`, {
      cache: 'no-store',
      next: { revalidate: 0 },
    })
    const payload = (await res.json().catch(() => null)) as CentralBriefsResponse | null
    if (!res.ok || !payload?.ok) return []
    return payload.briefs
  } catch {
    return []
  }
}

async function listLegacyBriefs(limit: number): Promise<PublicBrief[]> {
  const supabase = legacySupabase()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('daily_briefs')
    .select('id, brief_date, slug, subject, email_html, total_news, total_announcements, created_at, sent_at')
    .eq('is_published', true)
    .order('brief_date', { ascending: false })
    .limit(limit)

  if (error) return []
  return ((data ?? []) as LegacyDailyBriefRow[]).map(toLegacyPublicBrief)
}

async function getLegacyBriefBySlug(slug: string): Promise<PublicBrief | null> {
  const supabase = legacySupabase()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('daily_briefs')
    .select('id, brief_date, slug, subject, email_html, total_news, total_announcements, created_at, sent_at')
    .eq('slug', slug)
    .eq('is_published', true)
    .maybeSingle()

  if (error || !data) return null
  return toLegacyPublicBrief(data as LegacyDailyBriefRow)
}

export async function listPublicMorningBriefs(limit = 365): Promise<PublicBrief[]> {
  const morningBriefs = await fetchCentralBriefs(limit)
  const legacyBriefs = await listLegacyBriefs(limit)
  const byDate = new Map<string, PublicBrief>()

  for (const brief of morningBriefs) {
    byDate.set(brief.brief_date, brief)
  }
  for (const brief of legacyBriefs) {
    if (!byDate.has(brief.brief_date)) byDate.set(brief.brief_date, brief)
  }

  return Array.from(byDate.values())
    .sort((a, b) => b.brief_date.localeCompare(a.brief_date))
    .slice(0, limit)
}

export async function getPublicMorningBriefBySlug(slug: string): Promise<PublicBrief | null> {
  const briefDate = parseMorningBriefDateFromSlug(slug)
  if (!briefDate) return getLegacyBriefBySlug(slug)

  const [brief] = await fetchCentralBriefs(1, briefDate)
  return brief ?? getLegacyBriefBySlug(slug)
}
