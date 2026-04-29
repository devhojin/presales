import { NextResponse } from 'next/server'
import { morningBriefService } from '../../../../morning-brief/lib/supabase'
import { toPublicBrief, type MorningBriefRow } from '@/lib/public-briefs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = morningBriefService()
    const { data, error } = await sb
      .from('briefs')
      .select('id, brief_date, subject, html_body, news_count, started_at, finished_at')
      .eq('status', 'sent')
      .not('html_body', 'is', null)
      .order('brief_date', { ascending: false })
      .limit(365)

    if (error) {
      throw error
    }

    const briefs = ((data ?? []) as MorningBriefRow[]).map(toPublicBrief)

    return NextResponse.json(
      { ok: true, briefs },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : '브리프 로드 실패'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
