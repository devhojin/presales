import { createServerClient } from '@supabase/ssr'
import { SITE_NAME, SITE_URL } from '@/lib/constants'
import { morningBriefSlug } from '@/lib/public-briefs'
import { SEO_LANDING_LAST_MODIFIED, SEO_LANDING_PAGES, getSeoLandingDescription, seoLandingUrl } from '@/lib/seo-landing-pages'
import {
  AI_PROPOSAL_GUIDE_DESCRIPTION,
  AI_PROPOSAL_GUIDE_TITLE,
  aiProposalGuideIndexUrl,
  aiProposalGuideUrl,
  getAiProposalGuideCategory,
  getAiProposalGuideImageUrl,
  getAiProposalGuideSeoDescription,
  getAiProposalGuideSeoKeywords,
  sanitizeGuideHtml,
} from '@/lib/ai-proposal-guide'
import { getPublishedAiProposalGuideServerContent } from '@/lib/ai-proposal-guide-server'
import { normalizeSeoText, truncateSeoText } from '@/lib/seo-text'
import { morningBriefService } from '../../../morning-brief/lib/supabase'

export const dynamic = 'force-dynamic'

type RssItem = {
  title: string
  url: string
  description: string
  pubDate: Date
  category?: string
  categories?: string[]
  contentHtml?: string
  imageUrl?: string
}

type ProductRow = {
  id: number
  title: string
  description: string | null
  description_html: string | null
  updated_at: string | null
  created_at: string | null
  tags: string[] | null
  is_free: boolean | null
}

type AnnouncementRow = {
  id: string
  title: string
  description: string | null
  organization: string | null
  source: string | null
  updated_at: string | null
  end_date: string | null
}

type FeedRow = {
  id: string
  title: string
  content: string | null
  category: string
  source_name: string | null
  created_at: string | null
  updated_at: string | null
}

type BriefRow = {
  brief_date: string
  subject: string | null
  news_count: number | null
  started_at: string | null
  finished_at: string | null
}

function createSiteClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null

  return createServerClient(url, key, { cookies: { getAll() { return [] } } })
}

function escapeXml(value: string | number | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function toDate(value: string | null | undefined): Date {
  if (!value) return new Date()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date() : date
}

function itemXml(item: RssItem): string {
  const categories = Array.from(new Set([item.category, ...(item.categories ?? [])].filter(Boolean) as string[]))
  const categoryXml = categories.map((category) => `\n      <category>${escapeXml(category)}</category>`).join('')
  const contentXml = item.contentHtml
    ? `\n      <content:encoded>${cdata(sanitizeGuideHtml(item.contentHtml))}</content:encoded>`
    : ''
  const imageXml = item.imageUrl
    ? `\n      <media:content url="${escapeXml(item.imageUrl)}" medium="image" />`
    : ''
  return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <description>${escapeXml(item.description)}</description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>${categoryXml}${imageXml}${contentXml}
    </item>`
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

async function getProductItems(): Promise<RssItem[]> {
  const supabase = createSiteClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('products')
    .select('id, title, description, description_html, updated_at, created_at, tags, is_free')
    .eq('is_published', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(30)

  if (error) return []

  return ((data ?? []) as ProductRow[]).map((product) => {
    const description =
      truncateSeoText(product.description_html, 300) ||
      truncateSeoText(product.description, 300) ||
      `${product.title} 문서 자료입니다. ${product.is_free ? '무료 다운로드 가능' : '유료 전문 문서'}`
    return {
      title: product.title,
      url: `${SITE_URL}/store/${product.id}`,
      description,
      pubDate: toDate(product.updated_at ?? product.created_at),
      category: product.tags?.[0] ?? '문서 스토어',
    }
  })
}

async function getAnnouncementItems(): Promise<RssItem[]> {
  const supabase = createSiteClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, description, organization, source, updated_at, end_date')
    .eq('is_published', true)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(40)

  if (error) return []

  return ((data ?? []) as AnnouncementRow[]).map((announcement) => {
    const fallback = [announcement.organization, announcement.source, announcement.end_date ? `마감 ${announcement.end_date}` : null]
      .filter(Boolean)
      .join(' · ')
    return {
      title: announcement.title,
      url: `${SITE_URL}/announcements/${announcement.id}`,
      description: truncateSeoText(announcement.description, 300) || `${fallback} 공고입니다.`,
      pubDate: toDate(announcement.updated_at),
      category: '입찰공고',
    }
  })
}

async function getFeedItems(): Promise<RssItem[]> {
  const supabase = createSiteClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('community_posts')
    .select('id, title, content, category, source_name, created_at, updated_at')
    .eq('is_published', true)
    .eq('status', 'published')
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(40)

  if (error) return []

  return ((data ?? []) as FeedRow[]).map((feed) => ({
    title: feed.title,
    url: `${SITE_URL}/feeds/${feed.id}`,
    description: truncateSeoText(feed.content, 300) || `${feed.source_name ?? 'PRESALES'}에서 수집한 IT피드입니다.`,
    pubDate: toDate(feed.created_at ?? feed.updated_at),
    category: feed.category || 'IT피드',
  }))
}

async function getBriefItems(): Promise<RssItem[]> {
  try {
    const mb = morningBriefService()
    const { data, error } = await mb
      .from('briefs')
      .select('brief_date, subject, news_count, started_at, finished_at')
      .eq('status', 'sent')
      .order('brief_date', { ascending: false })
      .limit(20)

    if (error) return []

    return ((data ?? []) as BriefRow[]).map((brief) => ({
      title: brief.subject ?? `모닝브리프 - ${brief.brief_date}`,
      url: `${SITE_URL}/brief/${morningBriefSlug(brief.brief_date)}`,
      description: `${brief.brief_date} 기준 공공조달·스마트시티·AI/IoT 시장 동향과 공고 요약입니다. 뉴스 ${brief.news_count ?? 0}건을 정리했습니다.`,
      pubDate: toDate(brief.finished_at ?? brief.started_at ?? `${brief.brief_date}T07:00:00+09:00`),
      category: '모닝브리프',
    }))
  } catch {
    return []
  }
}

function getLandingItems(): RssItem[] {
  const date = new Date(SEO_LANDING_LAST_MODIFIED)
  return SEO_LANDING_PAGES.map((page) => ({
    title: page.title,
    url: seoLandingUrl(page.slug),
    description: getSeoLandingDescription(page),
    pubDate: date,
    category: page.primaryKeyword,
  }))
}

async function getAiProposalGuideItems(): Promise<RssItem[]> {
  const content = await getPublishedAiProposalGuideServerContent()
  const date = content.updatedAt ? new Date(content.updatedAt) : new Date()
  const indexItem: RssItem = {
    title: AI_PROPOSAL_GUIDE_TITLE,
    url: aiProposalGuideIndexUrl(),
    description: AI_PROPOSAL_GUIDE_DESCRIPTION,
    pubDate: date,
    category: AI_PROPOSAL_GUIDE_TITLE,
    categories: ['ChatGPT 제안서', 'RFP 분석', '나라장터 입찰'],
    imageUrl: getAiProposalGuideImageUrl(),
  }
  const guideItems = content.articles.map((guide) => {
    const category = getAiProposalGuideCategory(guide.categorySlug, content)
    return {
      title: guide.title,
      url: aiProposalGuideUrl(guide.slug),
      description: getAiProposalGuideSeoDescription(guide),
      pubDate: guide.updatedAt ? new Date(guide.updatedAt) : date,
      category: guide.primaryKeyword || AI_PROPOSAL_GUIDE_TITLE,
      categories: [AI_PROPOSAL_GUIDE_TITLE, category?.title, ...getAiProposalGuideSeoKeywords(guide)].filter(Boolean) as string[],
      contentHtml: guide.bodyHtml,
      imageUrl: getAiProposalGuideImageUrl(guide),
    }
  })

  return [indexItem, ...guideItems]
}

export async function GET() {
  const [
    productItems,
    announcementItems,
    feedItems,
    briefItems,
    aiProposalGuideItems,
  ] = await Promise.all([
    getProductItems(),
    getAnnouncementItems(),
    getFeedItems(),
    getBriefItems(),
    getAiProposalGuideItems(),
  ])

  const alwaysIncludedUrls = new Set(aiProposalGuideItems.map((item) => item.url))
  const sortedItems = [
    ...productItems,
    ...announcementItems,
    ...feedItems,
    ...briefItems,
    ...aiProposalGuideItems,
    ...getLandingItems(),
  ]
    .filter((item) => item.title && item.url.startsWith(SITE_URL))
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
  const items = [
    ...sortedItems.filter((item) => alwaysIncludedUrls.has(item.url)),
    ...sortedItems.filter((item) => !alwaysIncludedUrls.has(item.url)).slice(0, 180),
  ].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())

  const now = new Date()
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(SITE_NAME)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml('공공조달 제안서, 입찰공고, IT피드, 모닝브리프 최신 콘텐츠')}</description>
    <language>ko-KR</language>
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <ttl>30</ttl>
    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />
${items.map((item) => itemXml({ ...item, description: normalizeSeoText(item.description) })).join('\n')}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
    },
  })
}
