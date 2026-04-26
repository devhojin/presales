import { NextRequest, NextResponse } from 'next/server'
import { requireAdminForMorningBrief } from '../../../../../../morning-brief/lib/admin-auth'

export const runtime = 'nodejs'

interface SubscriberRow {
  id: string
  email: string
  name: string | null
  status: string
  subscribed_at: string
  unsubscribed_at: string | null
  last_sent_at: string | null
  send_count: number
  subscriber_sources: { source: string; added_at: string }[]
}

export async function GET(_req: NextRequest) {
  const auth = await requireAdminForMorningBrief()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { data, error } = await auth.mb
    .from('subscribers')
    .select('id, email, name, status, subscribed_at, unsubscribed_at, last_sent_at, send_count, subscriber_sources(source, added_at)')
    .order('subscribed_at', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (data ?? []) as unknown as SubscriberRow[]
  return NextResponse.json({
    ok: true,
    subscribers: rows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      status: r.status,
      subscribed_at: r.subscribed_at,
      unsubscribed_at: r.unsubscribed_at,
      last_sent_at: r.last_sent_at,
      send_count: r.send_count,
      sources: (r.subscriber_sources ?? []).map((s) => s.source).sort(),
    })),
  })
}
