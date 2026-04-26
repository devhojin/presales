import { NextRequest, NextResponse } from 'next/server'
import { subscribeEmail } from '../../../../../morning-brief/lib/subscribe'
import type { SourceSite } from '../../../../../morning-brief/lib/supabase'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = (await request.json()) as { email?: string; name?: string }
    if (!email) {
      return NextResponse.json({ ok: false, error: '이메일이 필요합니다' }, { status: 400 })
    }
    const source = (process.env.MORNING_BRIEF_SOURCE as SourceSite) || 'presales'
    const result = await subscribeEmail(email, name ?? null, source)
    if (!result.ok) {
      return NextResponse.json(result, { status: 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
