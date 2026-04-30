/**
 * 예약 작업: 매일 KST 06:50 (UTC 21:50 전날) 실행.
 * 1. Google News RSS 5카테고리 수집
 * 2. 4단계 dedup (cross-day 시드 + 해시 + 정규화 + 유사도)
 * 3. Claude Haiku semantic dedup
 * 4. news_items 에 저장
 * 5. briefs 에 오늘자 row 생성/업데이트 (status='ready')
 *
 * schedule: "50 21 * * *"
 * 인증: Authorization: Bearer ${MB_CRON_SECRET || CRON_SECRET}
 */
import { NextRequest, NextResponse } from 'next/server'
import { collectByCategory } from '../../../../../../morning-brief/lib/collect-news'
import { aiSemanticDedup } from '../../../../../../morning-brief/lib/dedup-claude'
import { saveNewsBatch } from '../../../../../../morning-brief/lib/archive'
import { morningBriefService } from '../../../../../../morning-brief/lib/supabase'
import { renderHtml } from '../../../../../../morning-brief/lib/render-brief'
import { CATEGORIES } from '../../../../../../morning-brief/lib/categories'

export const maxDuration = 300 // 5분 (수집 + AI dedup 시간 여유)
export const runtime = 'nodejs'

function authorized(req: NextRequest): boolean {
  const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!got) return false

  const allowedSecrets = [process.env.MB_CRON_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))

  return allowedSecrets.includes(got)
}

function todayKst(): string {
  // KST 기준 YYYY-MM-DD
  const utc = new Date()
  const kst = new Date(utc.getTime() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const sb = morningBriefService()
  const briefDate = todayKst()
  const startedAt = new Date().toISOString()
  const force = req.nextUrl.searchParams.get('force') === '1'
  const publishOnly = req.nextUrl.searchParams.get('publish_only') === '1'

  // 1. briefs row 확보
  const { data: existing } = await sb
    .from('briefs')
    .select('id, status')
    .eq('brief_date', briefDate)
    .maybeSingle()
  let briefId: string
  if (existing) {
    if (existing.status === 'sent' && !force) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        already_sent: true,
        brief_date: briefDate,
        brief_id: existing.id,
      })
    }
    briefId = existing.id
    await sb.from('briefs').update({ status: 'collecting', started_at: startedAt, error: null }).eq('id', briefId)
  } else {
    const { data, error } = await sb.from('briefs').insert({
      brief_date: briefDate, status: 'collecting', started_at: startedAt,
    }).select('id').single()
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
    briefId = data.id
  }

  try {
    // 2. 수집 + 1·2단계 dedup
    const collected = await collectByCategory({ excludeBriefId: briefId })
    const totalAfterBasic = Object.values(collected.byCategory).reduce((n, arr) => n + arr.length, 0)

    // 3. AI semantic dedup
    const aiResult = await aiSemanticDedup(collected.byCategory)
    const finalByCategory = aiResult.byCategory
    const newsCount = Object.values(finalByCategory).reduce((n, arr) => n + arr.length, 0)

    if (existing && force) {
      await sb.from('news_items').update({ used_in_brief: null }).eq('used_in_brief', briefId)
    }

    // 4. 아카이브 저장
    const saved = await saveNewsBatch(finalByCategory, briefId, { replaceExisting: Boolean(existing && force) })

    // 5. briefs 업데이트 — html/subject 는 send 단계에서
    const subject = `오늘의 모닝 브리프 - ${briefDate.replace(/-/g, '. ')}`
    const updates: Record<string, unknown> = {
      status: 'ready',
      news_count: newsCount,
      subject,
    }
    if (publishOnly) {
      updates.status = 'sent'
      updates.html_body = renderHtml({
        newsByCategory: finalByCategory,
        subscriberToken: '',
        topicsLabel: Object.values(CATEGORIES).flat().slice(0, 5).join(' · ') + ' 외',
        date: new Date(`${briefDate}T00:00:00+09:00`),
        unsubBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr',
      })
      updates.finished_at = new Date().toISOString()
    }
    await sb.from('briefs').update(updates).eq('id', briefId)

    return NextResponse.json({
      ok: true,
      brief_date: briefDate,
      brief_id: briefId,
      status: updates.status,
      stats: {
        fetched: collected.totalFetched,
        seed_recent: collected.seedSize,
        after_basic_dedup: totalAfterBasic,
        ai_dedup_before: aiResult.before,
        ai_dedup_after: aiResult.after,
        final: newsCount,
        archive_inserted: saved.inserted,
        archive_duplicates: saved.duplicates,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown'
    await sb.from('briefs').update({ status: 'failed', error: msg, finished_at: new Date().toISOString() }).eq('id', briefId)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

// POST 도 허용 (수동 트리거용)
export const POST = GET
