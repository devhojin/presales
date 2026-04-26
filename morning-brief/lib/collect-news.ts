/**
 * Google News RSS 수집. (daily-news.py.fetch_news_for_topic 포팅)
 */
import { CATEGORIES, ITEMS_PER_CATEGORY, ITEMS_PER_KEYWORD_FETCH, CROSS_DAY_DEDUP_DAYS } from './categories'
import { buildSeed, filterAgainstSeed, NewsItem } from './dedup'
import { morningBriefService } from './supabase'

const ITEM_REGEX = /<item>([\s\S]*?)<\/item>/g
const TITLE_REGEX = /<title>([\s\S]*?)<\/title>/
const LINK_REGEX = /<link>([\s\S]*?)<\/link>/
const DATE_REGEX = /<pubDate>([\s\S]*?)<\/pubDate>/
const SOURCE_REGEX = /<source[^>]*>([\s\S]*?)<\/source>/

async function fetchTopic(topic: string, limit: number): Promise<NewsItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(topic)}&hl=ko&gl=KR&ceid=KR:ko`
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 10000)
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (DailyNews Bot)' },
      signal: ctrl.signal,
    })
    if (!resp.ok) return []
    const xml = await resp.text()
    const items: NewsItem[] = []
    for (const m of xml.matchAll(ITEM_REGEX)) {
      const block = m[1]
      const t = TITLE_REGEX.exec(block)?.[1]?.trim()
      const link = LINK_REGEX.exec(block)?.[1]?.trim()
      if (!t || !link) continue
      items.push({
        title: t.replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link,
        date: DATE_REGEX.exec(block)?.[1]?.trim() ?? '',
        source: SOURCE_REGEX.exec(block)?.[1]?.trim() ?? '',
      })
      if (items.length >= limit) break
    }
    return items
  } catch {
    return []
  } finally {
    clearTimeout(timer)
  }
}

/** 최근 N일 news_items 에서 title 만 가져와 cross-day dedup 시드로 사용. */
async function loadRecentTitles(): Promise<string[]> {
  const sb = morningBriefService()
  const since = new Date(Date.now() - CROSS_DAY_DEDUP_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await sb
    .from('news_items')
    .select('title')
    .gte('collected_at', since)
    .limit(2000)
  if (error || !data) return []
  return data.map((r) => r.title as string).filter(Boolean)
}

export interface CollectResult {
  byCategory: Record<string, NewsItem[]>
  totalFetched: number
  seedSize: number
}

/** 카테고리별 수집 + 1·2단계 dedup. AI dedup 은 호출자 측에서. */
export async function collectByCategory(): Promise<CollectResult> {
  const recent = await loadRecentTitles()
  const seed = buildSeed(recent)

  const result: Record<string, NewsItem[]> = {}
  let totalFetched = 0
  const seenAcrossCategories = { exact: new Set<string>(), signatures: [] as Set<string>[] }

  for (const [cat, keywords] of Object.entries(CATEGORIES)) {
    const collected: NewsItem[] = []
    for (const kw of keywords) {
      const fetched = await fetchTopic(kw, ITEMS_PER_KEYWORD_FETCH)
      totalFetched += fetched.length
      const kept = filterAgainstSeed(
        fetched,
        seed,
        seenAcrossCategories,
        ITEMS_PER_CATEGORY - collected.length,
      )
      collected.push(...kept)
      if (collected.length >= ITEMS_PER_CATEGORY) break
    }
    result[cat] = collected.slice(0, ITEMS_PER_CATEGORY)
  }

  return { byCategory: result, totalFetched, seedSize: recent.length }
}
