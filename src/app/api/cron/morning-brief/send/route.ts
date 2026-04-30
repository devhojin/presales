/**
 * 예약 작업: 매일 KST 07:00 (UTC 22:00 전날) 실행.
 * 1. 오늘자 briefs 가 ready 인지 확인
 * 2. news_items 에서 used_in_brief = briefId 인 것 모아서 카테고리별 정렬
 * 3. 활성 구독자 전체에게 메일플러그 SMTP 발송
 * 4. brief_sends 에 결과 기록
 * 5. briefs 상태 sent / failed
 *
 * schedule: "0 22 * * *"
 */
import { NextRequest, NextResponse } from 'next/server'
import { renderHtml, renderText } from '../../../../../../morning-brief/lib/render-brief'
import { sendBriefMail } from '../../../../../../morning-brief/lib/send-mail'
import { morningBriefService } from '../../../../../../morning-brief/lib/supabase'
import { CATEGORIES } from '../../../../../../morning-brief/lib/categories'
import type { NewsItem } from '../../../../../../morning-brief/lib/dedup'

export const maxDuration = 300
export const runtime = 'nodejs'

type SupabaseClientLike = ReturnType<typeof morningBriefService>

interface Recipient {
  subscriptionId: string
  subscriberId: string
  email: string
  token: string
  sendCount: number
}

function nestedOne<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function authorized(req: NextRequest): boolean {
  const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!got) return false

  const allowedSecrets = [process.env.MB_CRON_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))

  return allowedSecrets.includes(got)
}

function todayKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

async function getDefaultBriefTypeId(sb: SupabaseClientLike): Promise<string | null> {
  const { data, error } = await sb
    .from('brief_types')
    .select('id')
    .eq('key', 'public_procurement_daily')
    .maybeSingle()

  if (error) throw error
  return (data?.id as string | undefined) ?? null
}

async function loadRecipients(sb: SupabaseClientLike, briefTypeId: string): Promise<Recipient[]> {
  const { data, error } = await sb
    .from('brief_subscriptions')
    .select(`
      id,
      subscriber_id,
      deleted_at,
      subscribers!inner(id, email, token, status, send_count, deleted_at)
    `)
    .eq('brief_type_id', briefTypeId)
    .eq('status', 'active')
    .is('deleted_at', null)
    .eq('subscribers.status', 'active')
    .is('subscribers.deleted_at', null)

  if (error) throw error

  return ((data ?? []) as Array<{
    id: string
    subscriber_id: string
    deleted_at: string | null
    subscribers: {
      id: string
      email: string
      token: string | null
      status: string
      send_count: number | null
      deleted_at: string | null
    } | Array<{
      id: string
      email: string
      token: string | null
      status: string
      send_count: number | null
      deleted_at: string | null
    }> | null
  }>).flatMap((row) => {
    const subscriber = nestedOne(row.subscribers)
    if (!subscriber || row.deleted_at || subscriber.status !== 'active' || subscriber.deleted_at) return []

    return [{
      subscriptionId: row.id,
      subscriberId: subscriber.id,
      email: subscriber.email,
      token: subscriber.token || '',
      sendCount: subscriber.send_count || 0,
    }]
  })
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const sb = morningBriefService()
  const briefDate = req.nextUrl.searchParams.get('date') || todayKst()
  const briefTypeId = await getDefaultBriefTypeId(sb)
  if (!briefTypeId) {
    return NextResponse.json({ ok: false, error: 'default brief type not found' }, { status: 500 })
  }

  const { data: brief, error: bErr } = await sb
    .from('briefs')
    .select('id, status, subject, brief_type_id')
    .eq('brief_type_id', briefTypeId)
    .eq('brief_date', briefDate)
    .maybeSingle()
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

  // 중앙 관리자에서 활성 상태인 구독권만 발송한다.
  // 구형 subscribers 전체 발송 fallback은 관리자 삭제/수신거부 상태를 우회할 수 있어 사용하지 않는다.
  let recipients: Recipient[]
  try {
    recipients = await loadRecipients(sb, briefTypeId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'recipient query failed'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }

  await sb.from('briefs').update({
    status: 'sending',
    recipient_count: recipients.length,
  }).eq('id', brief.id)

  const subject = brief.subject || `오늘의 모닝 브리프 - ${briefDate}`
  const topicsLabel = Object.values(CATEGORIES).flat().slice(0, 5).join(' · ') + ' 외'
  const publicHtml = renderHtml({
    newsByCategory: byCategory,
    subscriberToken: '',
    topicsLabel,
    date: new Date(briefDate),
    unsubBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr',
  })
  let sent = 0
  let failed = 0
  const failureReasons = new Map<string, number>()
  const sendsLog: {
    brief_id: string
    subscriber_id: string
    brief_subscription_id: string
    email: string
    status: string
    sent_at: string | null
    error: string | null
  }[] = []

  for (const r of recipients) {
    const html = renderHtml({
      newsByCategory: byCategory,
      subscriberToken: r.token,
      topicsLabel,
      date: new Date(briefDate),
      unsubBaseUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://presales.co.kr',
    })
    const text = renderText({
      newsByCategory: byCategory, subscriberToken: '', topicsLabel,
      date: new Date(briefDate),
    })
    try {
      await sendBriefMail({ to: r.email, subject, html, text })
      sent++
      sendsLog.push({
        brief_id: brief.id, subscriber_id: r.subscriberId, brief_subscription_id: r.subscriptionId, email: r.email,
        status: 'sent', sent_at: new Date().toISOString(), error: null,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'unknown'
      failed++
      failureReasons.set(message, (failureReasons.get(message) ?? 0) + 1)
      sendsLog.push({
        brief_id: brief.id, subscriber_id: r.subscriberId, brief_subscription_id: r.subscriptionId, email: r.email,
        status: 'failed', sent_at: null, error: message,
      })
    }
  }

  const failureSummary = Array.from(failureReasons, ([message, count]) => ({ message, count }))
  if (failureSummary.length > 0) {
    console.error('[morning-brief/send] delivery failures', failureSummary)
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
    subject,
    html_body: publicHtml,
    news_count: newsCount,
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
    failure_reasons: failureSummary,
  })
}

export const POST = GET
