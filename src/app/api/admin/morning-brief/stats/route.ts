import { NextRequest, NextResponse } from 'next/server'
import { requireAdminForMorningBrief } from '../../../../../../morning-brief/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const auth = await requireAdminForMorningBrief()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const [
    totalRes,
    activeRes,
    unsubRes,
    sourceRes,
    latestBriefRes,
  ] = await Promise.all([
    auth.mb.from('subscribers').select('id', { count: 'exact', head: true }),
    auth.mb.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    auth.mb.from('subscribers').select('id', { count: 'exact', head: true }).eq('status', 'unsubscribed'),
    auth.mb.from('subscriber_sources').select('source'),
    auth.mb.from('briefs').select('brief_date, status, sent_count, recipient_count, finished_at')
      .order('brief_date', { ascending: false }).limit(1).maybeSingle(),
  ])

  const sourceCounts: Record<string, number> = {}
  for (const r of (sourceRes.data ?? []) as { source: string }[]) {
    sourceCounts[r.source] = (sourceCounts[r.source] ?? 0) + 1
  }

  return NextResponse.json({
    ok: true,
    stats: {
      total: totalRes.count ?? 0,
      active: activeRes.count ?? 0,
      unsubscribed: unsubRes.count ?? 0,
      bySource: sourceCounts,
      latestBrief: latestBriefRes.data ?? null,
    },
  })
}
