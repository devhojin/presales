import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json() as { email: string; name?: string }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ ok: false, error: '올바른 이메일 주소가 아닙니다' }, { status: 400 })
    }

    const service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )

    // 이미 존재하는지 확인
    const { data: existing } = await service
      .from('brief_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ ok: true, already: true, message: '이미 구독 중입니다' })
      }
      // 재구독: status 되살리기
      const { error: updErr } = await service
        .from('brief_subscribers')
        .update({
          status: 'active',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          name: name || null,
        })
        .eq('id', existing.id)
      if (updErr) {
        return NextResponse.json({ ok: false, error: updErr.message }, { status: 500 })
      }
      return NextResponse.json({ ok: true, resubscribed: true })
    }

    // 신규 구독
    const token = randomBytes(16).toString('base64url')
    const { error: insErr } = await service
      .from('brief_subscribers')
      .insert({
        email: email.toLowerCase(),
        name: name || null,
        token,
        status: 'active',
        source: 'web',
      })

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
