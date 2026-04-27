import { NextRequest, NextResponse } from 'next/server'
import { requireAdminForMorningBrief } from '../../../../../../morning-brief/lib/admin-auth'

export const runtime = 'nodejs'

export async function GET(_req: NextRequest) {
  const auth = await requireAdminForMorningBrief()
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status })

  const { data, error } = await auth.mb
    .from('briefs')
    .select('id, brief_date, status, news_count, recipient_count, sent_count, failed_count, subject, finished_at')
    .order('brief_date', { ascending: false })

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    briefs: data ?? [],
  })
}
