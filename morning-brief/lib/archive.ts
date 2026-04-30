/**
 * news_items 테이블에 수집 결과 저장. (news_archive.py.save_news_batch 포팅)
 * 같은 url_hash 가 이미 있으면 무시 (cross-day dedup 시드로만 활용).
 */
import { detectDomains } from './categories'
import { type NewsItem, urlHash } from './dedup'
import { morningBriefService } from './supabase'

export interface SaveResult {
  inserted: number
  duplicates: number
  failed: number
}

export async function saveNewsBatch(
  byCategory: Record<string, NewsItem[]>,
  briefId: string | null,
  options: { replaceExisting?: boolean } = {},
): Promise<SaveResult> {
  const sb = morningBriefService()
  const rows: {
    url: string; url_hash: string; title: string; source_media: string | null;
    category: string; domain: string | null; pub_date: string | null;
    raw: object; used_in_brief: string | null;
  }[] = []

  for (const [category, items] of Object.entries(byCategory)) {
    for (const it of items) {
      const url = (it.link ?? '').trim()
      const title = (it.title ?? '').trim()
      if (!url || !title) continue
      const domains = detectDomains(`${title} ${category}`)
      rows.push({
        url,
        url_hash: urlHash(url),
        title,
        source_media: it.source ?? null,
        category,
        domain: domains[0] ?? null,
        pub_date: null, // 원본은 RFC822, 파싱 정확도 떨어져 일단 null
        raw: { rss_pub_date: it.date ?? null, all_domains: domains },
        used_in_brief: briefId,
      })
    }
  }

  if (rows.length === 0) return { inserted: 0, duplicates: 0, failed: 0 }

  // 100건씩 chunk + ON CONFLICT (url_hash) DO NOTHING
  let inserted = 0
  let duplicates = 0
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { data, error } = await sb
      .from('news_items')
      .upsert(chunk, options.replaceExisting
        ? { onConflict: 'url_hash' }
        : { onConflict: 'url_hash', ignoreDuplicates: true })
      .select('id')
    if (error) {
      console.warn('[archive] insert error:', error.message)
      continue
    }
    inserted += data?.length ?? 0
    duplicates += chunk.length - (data?.length ?? 0)
  }
  return { inserted, duplicates, failed: 0 }
}
