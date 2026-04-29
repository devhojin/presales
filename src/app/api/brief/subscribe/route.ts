import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { randomBytes } from 'crypto'
import { checkRateLimitAsync } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/client-ip'
import { presalesServiceClient, subscribeViaMorningBrief } from '@/lib/morning-brief-platform'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    // Rate limit: IP 당 분당 3회 (구독 폭탄·SMTP 비용 방지)
    const headersList = await headers()
    const ip = getClientIp(headersList)
    const rl = await checkRateLimitAsync(`brief-subscribe:${ip}`, 3, 60000)
    if (!rl.allowed) {
      return NextResponse.json({ ok: false, error: 'Too many requests' }, {
        status: 429,
        headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
      })
    }

    const { email, name, source: rawSource } = await request.json() as {
      email: string
      name?: string
      source?: string
    }
    if (!email || typeof email !== 'string' || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ ok: false, error: '올바른 이메일 주소가 아닙니다' }, { status: 400 })
    }
    // 이름 길이 제한 (DB 오염 방지)
    if (name && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json({ ok: false, error: '이름이 너무 깁니다' }, { status: 400 })
    }
    // 가입 경로 소스 — 외부 사이트 릴레이가 'maru_ai_homepage' 등을 보낼 수 있도록 허용
    // 형식: 영문 소문자 / 숫자 / _ / - 만, 길이 ≤ 50
    let source = 'presales'
    if (typeof rawSource === 'string' && rawSource.length > 0) {
      if (rawSource.length > 50 || !/^[a-z0-9_-]+$/.test(rawSource)) {
        return NextResponse.json({ ok: false, error: 'source 형식이 올바르지 않습니다' }, { status: 400 })
      }
      source = rawSource
    }

    const service = presalesServiceClient()

    const lowerEmail = email.toLowerCase()
    const { data: profile } = await service
      .from('profiles')
      .select('id')
      .eq('email', lowerEmail)
      .maybeSingle()

    const central = await subscribeViaMorningBrief({
      email: lowerEmail,
      name: name || null,
      sourceSite: 'presales',
      sourceUserId: profile?.id ?? null,
      sourceMemberState: profile?.id ? 'member' : 'guest',
      briefTypeKey: 'public_procurement_daily',
      metadata: {
        source_route: '/brief',
      },
    })

    if (!central.ok) {
      return NextResponse.json({ ok: false, error: central.error || '모닝브리프 중앙 등록 실패' }, { status: 502 })
    }

    // 프리세일즈 로컬에는 "신청 기록"만 남긴다. 삭제/수신거부의 원본 상태는 morning-brief에서 관리한다.
    const { data: existing } = await service
      .from('brief_subscribers')
      .select('id, status')
      .eq('email', lowerEmail)
      .maybeSingle()

    if (existing) {
      await service
        .from('brief_subscribers')
        .update({
          status: central.status || 'active',
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          name: name || null,
          source,
        })
        .eq('id', existing.id)
      return NextResponse.json({
        ok: true,
        already: !central.created && !central.resubscribed,
        resubscribed: central.resubscribed,
        central,
        message: central.message || '모닝브리프 신청 기록이 갱신되었습니다',
      })
    }

    const token = randomBytes(16).toString('base64url')
    const { error: insErr } = await service
      .from('brief_subscribers')
      .insert({
        email: lowerEmail,
        name: name || null,
        token,
        status: central.status || 'active',
        source,
      })

    if (insErr) {
      return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, central, message: central.message || '구독 신청 완료' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
