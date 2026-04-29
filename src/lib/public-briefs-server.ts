import { createServerClient } from '@supabase/ssr'
import { CATEGORIES } from '../../morning-brief/lib/categories'
import type { NewsItem } from '../../morning-brief/lib/dedup'
import { renderHtml } from '../../morning-brief/lib/render-brief'
import { morningBriefService } from '../../morning-brief/lib/supabase'
import { parseMorningBriefDateFromSlug, toPublicBrief, type MorningBriefRow, type PublicBrief } from '@/lib/public-briefs'

type SupabaseClientLike = ReturnType<typeof morningBriefService>

interface NewsItemRow {
  title: string
  url: string
  source_media: string | null
  category: string | null
  raw: { rss_pub_date?: string } | null
}

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

const BRIEF_SELECT = 'id, brief_date, subject, html_body, news_count, started_at, finished_at'
const NEWS_SELECT = 'title, url, source_media, category, raw'

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

function briefDateToKstDate(briefDate: string): Date {
  return new Date(`${briefDate}T00:00:00+09:00`)
}

function topicsLabel(): string {
  return `${Object.values(CATEGORIES).flat().slice(0, 5).join(' · ')} 외`
}

function groupNewsItems(rows: NewsItemRow[]): Record<string, NewsItem[]> {
  const byCategory: Record<string, NewsItem[]> = {}
  for (const category of Object.keys(CATEGORIES)) {
    byCategory[category] = []
  }

  for (const row of rows) {
    const category = row.category ?? '기타'
    if (!byCategory[category]) byCategory[category] = []

    byCategory[category].push({
      title: row.title,
      link: row.url,
      source: row.source_media ?? '',
      date: row.raw?.rss_pub_date ?? '',
    })
  }

  return byCategory
}

async function buildPublicHtml(sb: SupabaseClientLike, row: MorningBriefRow): Promise<{ html: string; newsCount: number }> {
  const { data, error } = await sb
    .from('news_items')
    .select(NEWS_SELECT)
    .eq('used_in_brief', row.id)
    .order('collected_at', { ascending: true })

  if (error) throw error

  const items = (data ?? []) as NewsItemRow[]
  const newsByCategory = groupNewsItems(items)
  const html = renderHtml({
    newsByCategory,
    subscriberToken: '',
    topicsLabel: topicsLabel(),
    date: briefDateToKstDate(row.brief_date),
    unsubBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr',
  })

  return { html, newsCount: items.length }
}

async function hydratePublicBrief(sb: SupabaseClientLike, row: MorningBriefRow): Promise<PublicBrief> {
  const brief = toPublicBrief(row)
  if (brief.email_html) return brief

  const { html, newsCount } = await buildPublicHtml(sb, row)
  return {
    ...brief,
    email_html: html,
    total_news: brief.total_news || newsCount,
  }
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
  const sb = morningBriefService()
  const { data, error } = await sb
    .from('briefs')
    .select(BRIEF_SELECT)
    .eq('status', 'sent')
    .order('brief_date', { ascending: false })
    .limit(limit)

  if (error) throw error

  const morningBriefs = await Promise.all(((data ?? []) as MorningBriefRow[]).map((row) => hydratePublicBrief(sb, row)))
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

  const sb = morningBriefService()
  const { data, error } = await sb
    .from('briefs')
    .select(BRIEF_SELECT)
    .eq('brief_date', briefDate)
    .eq('status', 'sent')
    .maybeSingle()

  if (error) throw error
  if (!data) return getLegacyBriefBySlug(slug)

  return hydratePublicBrief(sb, data as MorningBriefRow)
}
