import { NextRequest, NextResponse } from 'next/server'
import { presalesServiceClient, unsubscribeViaMorningBrief } from '@/lib/morning-brief-platform'

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token') || ''
    if (!token) {
      return NextResponse.json({ ok: false, error: '토큰이 필요합니다' }, { status: 400 })
    }

    const central = await unsubscribeViaMorningBrief(token)
    if (central.ok) {
      return NextResponse.json({
        ok: true,
        already: central.already,
        email: central.email,
        mode: central.mode,
      })
    }

    const service = presalesServiceClient()

    // 예전 프리세일즈 메일에 포함된 로컬 토큰은 계속 수신거부할 수 있게 둔다.
    const { data: sub } = await service
      .from('brief_subscribers')
      .select('id, email, status')
      .eq('token', token)
      .maybeSingle()

    if (!sub) {
      return NextResponse.json({ ok: false, error: '유효하지 않은 토큰입니다' }, { status: 404 })
    }

    if (sub.status === 'unsubscribed') {
      return NextResponse.json({ ok: true, already: true, email: sub.email })
    }

    const { error: updErr } = await service
      .from('brief_subscribers')
      .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() })
      .eq('id', sub.id)

    if (updErr) {
      return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, email: sub.email })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
