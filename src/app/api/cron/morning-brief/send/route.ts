/**
 * Vercel Cron: 매일 KST 07:00 (UTC 22:00 전날) 실행.
 * 1. 오늘자 briefs 가 ready 인지 확인
 * 2. news_items 에서 used_in_brief = briefId 인 것 모아서 카테고리별 정렬
 * 3. 활성 구독자 전체에게 메일플러그 SMTP 발송
 * 4. brief_sends 에 결과 기록
 * 5. briefs 상태 sent / failed
 *
 * vercel.json 의 schedule: "0 22 * * *"
 */
import { NextRequest, NextResponse } from 'next/server'
import { renderHtml, renderText } from '../../../../../../morning-brief/lib/render-brief'
import { sendBriefMail } from '../../../../../../morning-brief/lib/send-mail'
import { morningBriefService } from '../../../../../../morning-brief/lib/supabase'
import { CATEGORIES } from '../../../../../../morning-brief/lib/categories'
import type { NewsItem } from '../../../../../../morning-brief/lib/dedup'

export const maxDuration = 300
export const runtime = 'nodejs'

function authorized(req: NextRequest): boolean {
  // MB_CRON_SECRET — 모닝브리프 전용. 기존 presales의 CRON_SECRET 과 분리.
  const expected = process.env.MB_CRON_SECRET
  if (!expected) return false
  return req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') === expected
}

function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const sb = morningBriefService()
  const briefDate = req.nextUrl.searchParams.get('date') || todayKst()

  const { data: brief, error: bErr } = await sb
    .from('briefs').select('id, status, subject').eq('brief_date', briefDate).maybeSingle()
  if (bErr) return NextResponse.json({ ok: false, error: bErr.message }, { status: 500 })
  if (!brief) return NextResponse.json({ ok: false, error: `brief for ${briefDate} not found — collect-news 먼저 실행` }, { status: 404 })
  if (brief.status === 'sent') return NextResponse.json({ ok: true, already_sent: true, brief_id: brief.id })

  // 뉴스 수집 (카테고리별 정렬)
  const { data: items } = await sb
    .from('news_items')
    .select('title, url, source_media, category, raw')
    .eq('used_in_brief', brief.id)
    .order('collected_at', { ascending: true })
  const byCategory: Record<string, NewsItem[]> = {}
  for (const cat of Object.keys(CATEGORIES)) byCategory[cat] = []
  for (const r of items ?? []) {
    const cat = (r.category as string) ?? '기타'
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push({
      title: r.title as string,
      link: r.url as string,
      source: (r.source_media as string) ?? '',
      date: ((r.raw as { rss_pub_date?: string } | null)?.rss_pub_date) ?? '',
    })
  }
  const newsCount = (items ?? []).length

  // 활성 구독자
  const { data: subs, error: sErr } = await sb
    .from('subscribers')
    .select('id, email, token')
    .eq('status', 'active')
  if (sErr) return NextResponse.json({ ok: false, error: sErr.message }, { status: 500 })
  const recipients = subs ?? []

  await sb.from('briefs').update({
    status: 'sending',
    recipient_count: recipients.length,
  }).eq('id', brief.id)

  const subject = brief.subject || `오늘의 모닝 브리프 - ${briefDate}`
  const topicsLabel = Object.values(CATEGORIES).flat().slice(0, 5).join(' · ') + ' 외'
  let sent = 0
  let failed = 0
  const sendsLog: { brief_id: string; subscriber_id: string; email: string; status: string; sent_at: string | null; error: string | null }[] = []

  for (const r of recipients) {
    const html = renderHtml({
      newsByCategory: byCategory,
      subscriberToken: (r.token as string) || '',
      topicsLabel,
      date: new Date(briefDate),
      unsubBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr',
    })
    const text = renderText({
      newsByCategory: byCategory, subscriberToken: '', topicsLabel,
      date: new Date(briefDate),
    })
    try {
      await sendBriefMail({ to: r.email as string, subject, html, text })
      sent++
      sendsLog.push({
        brief_id: brief.id, subscriber_id: r.id as string, email: r.email as string,
        status: 'sent', sent_at: new Date().toISOString(), error: null,
      })
    } catch (e) {
      failed++
      sendsLog.push({
        brief_id: brief.id, subscriber_id: r.id as string, email: r.email as string,
        status: 'failed', sent_at: null, error: e instanceof Error ? e.message : 'unknown',
      })
    }
  }

  // brief_sends 기록 (upsert: brief_id+subscriber_id unique)
  if (sendsLog.length) {
    await sb.from('brief_sends').upsert(sendsLog, { onConflict: 'brief_id,subscriber_id' })
  }

  // 발송 성공자 last_sent_at / send_count 갱신
  if (sent > 0) {
    const sentIds = sendsLog.filter((l) => l.status === 'sent').map((l) => l.subscriber_id)
    // PostgREST 의 RPC 또는 multi-update — 여기서는 단순 loop
    for (const id of sentIds) {
      await sb.rpc('increment_send_count', { sub_id: id }).then(() => {}, () => {
        // RPC 없으면 그냥 fallback — last_sent_at만 업데이트
        return sb.from('subscribers').update({ last_sent_at: new Date().toISOString() }).eq('id', id)
      })
    }
  }

  await sb.from('briefs').update({
    status: failed > 0 && sent === 0 ? 'failed' : 'sent',
    sent_count: sent,
    failed_count: failed,
    finished_at: new Date().toISOString(),
  }).eq('id', brief.id)

  return NextResponse.json({
    ok: true,
    brief_date: briefDate,
    brief_id: brief.id,
    news_count: newsCount,
    recipient_count: recipients.length,
    sent,
    failed,
  })
}

export const POST = GET
