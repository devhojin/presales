/**
 * 서버사이드 로그인 잠금 API (KISA: 5회 실패 시 15분 잠금)
 * - profiles 테이블의 login_failed_count, login_locked_until 컬럼 활용
 * - email 기반 잠금 (브라우저 우회 불가)
 *
 * GET  /api/auth/login-attempt?email=...  → 잠금 상태 확인
 * POST /api/auth/login-attempt            → 실패 기록
 * DELETE /api/auth/login-attempt          → 성공 시 초기화
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/rate-limit'

const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

interface LockStatus {
  locked: boolean
  remainingMinutes: number
  failedCount: number
}

/** GET: 잠금 상태 확인 */
export async function GET(req: NextRequest): Promise<NextResponse<LockStatus | { error: string }>> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(`auth:${ip}`, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    }) as NextResponse<{ error: string }>
  }

  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = adminClient()

  // auth.users에서 uid 조회
  const { data: users, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }

  const user = users.users.find((u) => u.email === email.toLowerCase())
  if (!user) {
    // 존재하지 않는 이메일은 잠금 없음으로 응답 (이메일 열거 방지)
    return NextResponse.json({ locked: false, remainingMinutes: 0, failedCount: 0 })
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('login_failed_count, login_locked_until')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ locked: false, remainingMinutes: 0, failedCount: 0 })
  }

  const now = new Date()
  const lockedUntil = profile.login_locked_until ? new Date(profile.login_locked_until) : null

  if (lockedUntil && now < lockedUntil) {
    const remainingMs = lockedUntil.getTime() - now.getTime()
    const remainingMinutes = Math.ceil(remainingMs / 60000)
    return NextResponse.json({ locked: true, remainingMinutes, failedCount: profile.login_failed_count })
  }

  // 잠금 만료됐으면 카운트 초기화
  if (lockedUntil && now >= lockedUntil) {
    await supabase
      .from('profiles')
      .update({ login_failed_count: 0, login_locked_until: null })
      .eq('id', user.id)
    return NextResponse.json({ locked: false, remainingMinutes: 0, failedCount: 0 })
  }

  return NextResponse.json({
    locked: false,
    remainingMinutes: 0,
    failedCount: profile.login_failed_count,
  })
}

/** POST: 로그인 실패 기록 */
export async function POST(req: NextRequest): Promise<NextResponse<{ locked: boolean; attemptsLeft: number } | { error: string }>> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(`auth:${ip}`, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    }) as NextResponse<{ error: string }>
  }

  const body = (await req.json()) as { email?: string }
  const email = body.email
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }

  const user = users.users.find((u) => u.email === email.toLowerCase())
  if (!user) {
    // 존재하지 않는 이메일: 잠금 없음으로 응답 (이메일 열거 방지)
    return NextResponse.json({ locked: false, attemptsLeft: MAX_ATTEMPTS - 1 })
  }

  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('login_failed_count, login_locked_until')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return NextResponse.json({ locked: false, attemptsLeft: MAX_ATTEMPTS - 1 })
  }

  const now = new Date()
  const lockedUntil = profile.login_locked_until ? new Date(profile.login_locked_until) : null

  // 이미 잠금 중이면 그대로 반환
  if (lockedUntil && now < lockedUntil) {
    const remainingMs = lockedUntil.getTime() - now.getTime()
    const remainingMinutes = Math.ceil(remainingMs / 60000)
    return NextResponse.json({ locked: true, attemptsLeft: 0, remainingMinutes })
  }

  // 잠금 만료 후 첫 실패: 카운트 리셋 후 1로
  let newCount = profile.login_failed_count + 1
  if (lockedUntil && now >= lockedUntil) {
    newCount = 1
  }

  let newLockedUntil: string | null = null
  if (newCount >= MAX_ATTEMPTS) {
    const lockTime = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
    newLockedUntil = lockTime.toISOString()
  }

  await supabase
    .from('profiles')
    .update({
      login_failed_count: newCount,
      login_locked_until: newLockedUntil,
    })
    .eq('id', user.id)

  if (newLockedUntil) {
    return NextResponse.json({ locked: true, attemptsLeft: 0 })
  }

  return NextResponse.json({ locked: false, attemptsLeft: MAX_ATTEMPTS - newCount })
}

/** DELETE: 로그인 성공 시 잠금 초기화 */
export async function DELETE(req: NextRequest): Promise<NextResponse<{ ok: boolean } | { error: string }>> {
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for') ?? 'unknown'
  const rl = checkRateLimit(`auth:${ip}`, 10, 60000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': '60', 'X-RateLimit-Remaining': String(rl.remaining) },
    }) as NextResponse<{ error: string }>
  }

  const body = (await req.json()) as { email?: string }
  const email = body.email
  if (!email) {
    return NextResponse.json({ error: 'email required' }, { status: 400 })
  }

  const supabase = adminClient()

  const { data: users, error: userErr } = await supabase.auth.admin.listUsers()
  if (userErr) {
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }

  const user = users.users.find((u) => u.email === email.toLowerCase())
  if (!user) {
    return NextResponse.json({ ok: true })
  }

  await supabase
    .from('profiles')
    .update({ login_failed_count: 0, login_locked_until: null })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
