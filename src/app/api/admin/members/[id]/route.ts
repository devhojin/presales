import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getPasswordAuthErrorMessage, validatePassword } from '@/lib/password-policy'

interface DynamicUpdateClient {
  from(table: string): {
    update(values: Record<string, unknown>): {
      eq(column: string, value: string): Promise<{ error: { message: string } | null }>
    }
    delete(): {
      eq(column: string, value: string): Promise<{ error: { message: string } | null }>
    }
  }
}

interface RepairAuthClient {
  auth: {
    admin: {
      createUser(attributes: {
        email: string
        password: string
        email_confirm: boolean
        user_metadata: { name: string }
      }): Promise<{
        data: { user: { id: string; email?: string } | null }
        error: { message: string } | null
      }>
      deleteUser(userId: string, shouldSoftDelete?: boolean): Promise<{ error: { message: string } | null }>
    }
  }
}

type RepairClient = DynamicUpdateClient & RepairAuthClient

interface ProfileSnapshot {
  email: string | null
  name: string | null
  phone: string | null
  company: string | null
  role: string | null
  admin_memo: string | null
  reward_balance: number | null
  created_at: string | null
  deleted_at: string | null
}

const MEMBER_REFERENCE_UPDATES: Array<{ table: string; column: string }> = [
  { table: 'orders', column: 'user_id' },
  { table: 'download_logs', column: 'user_id' },
  { table: 'reviews', column: 'user_id' },
  { table: 'review_helpful', column: 'user_id' },
  { table: 'consulting_requests', column: 'user_id' },
  { table: 'cart_items', column: 'user_id' },
  { table: 'coupon_uses', column: 'user_id' },
  { table: 'user_coupons', column: 'user_id' },
  { table: 'reward_point_ledger', column: 'user_id' },
  { table: 'announcement_bookmarks', column: 'user_id' },
  { table: 'announcement_reads', column: 'user_id' },
  { table: 'feed_bookmarks', column: 'user_id' },
  { table: 'feed_reads', column: 'user_id' },
  { table: 'chat_rooms', column: 'user_id' },
  { table: 'chat_payment_requests', column: 'user_id' },
  { table: 'chat_messages', column: 'sender_id' },
  { table: 'community_posts', column: 'created_by' },
]

function parseAuthErrorMessage(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as { msg?: string; message?: string; error?: string }
    const message = parsed.msg || parsed.message || parsed.error || raw
    return getPasswordAuthErrorMessage(message)
  } catch {
    return getPasswordAuthErrorMessage(raw)
  }
}

function isMissingAuthUserLoadFailure(raw: string): boolean {
  return parseAuthErrorMessage(raw).includes('Database error loading user')
}

async function moveMemberReferences(
  service: DynamicUpdateClient,
  oldUserId: string,
  newUserId: string,
) {
  for (const ref of MEMBER_REFERENCE_UPDATES) {
    const { error } = await service
      .from(ref.table)
      .update({ [ref.column]: newUserId })
      .eq(ref.column, oldUserId)

    if (error) {
      throw new Error(`${ref.table}.${ref.column}: ${error.message}`)
    }
  }
}

async function repairMissingAuthUser(
  service: RepairClient,
  oldUserId: string,
  target: ProfileSnapshot,
  email: string,
  password: string,
): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const { data: created, error: createError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: target.name || email.split('@')[0] },
  })

  const newUserId = created.user?.id
  if (createError || !newUserId) {
    return {
      ok: false,
      error: createError?.message || 'Auth 계정 생성에 실패했습니다',
    }
  }

  let referencesStarted = false
  try {
    const { error: profileCopyError } = await service
      .from('profiles')
      .update({
        email,
        name: target.name,
        phone: target.phone,
        company: target.company,
        role: target.role || 'user',
        admin_memo: target.admin_memo,
        reward_balance: target.reward_balance ?? 0,
        created_at: target.created_at,
        login_failed_count: 0,
        login_locked_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newUserId)

    if (profileCopyError) throw new Error(`profiles.${newUserId}: ${profileCopyError.message}`)

    referencesStarted = true
    await moveMemberReferences(service, oldUserId, newUserId)

    const { error: oldProfileDeleteError } = await service
      .from('profiles')
      .delete()
      .eq('id', oldUserId)

    if (oldProfileDeleteError) throw new Error(`profiles.${oldUserId}: ${oldProfileDeleteError.message}`)

    return { ok: true, userId: newUserId }
  } catch (err) {
    if (!referencesStarted) {
      await service.auth.admin.deleteUser(newUserId, false).catch(() => {})
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : '회원 Auth 복구 중 오류가 발생했습니다',
    }
  }
}

/**
 * PATCH /api/admin/members/[id]
 * 관리자가 회원 정보를 수정 (이름, 이메일, 전화번호, 회사, 비밀번호)
 * 이메일/비밀번호 변경 시 auth.users 도 함께 업데이트
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // 1. 관리자 세션 확인
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // 관리자 확인
  const { data: me } = await service.from('profiles').select('role').eq('id', user.id).single()
  if (me?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 수정 가능합니다' }, { status: 403 })
  }

  // R14: 대상 회원이 soft-deleted (탈퇴) 상태인지 확인 — 탈퇴 회원 정보는 R13 기조에 따라 동결
  // 관리자가 실수로 탈퇴 row 의 익명화된 email 을 실제 이메일로 되돌리면 탈퇴 우회됨
  const { data: target } = await service
    .from('profiles')
    .select('deleted_at, email, name, phone, company, role, admin_memo, reward_balance, created_at')
    .eq('id', id)
    .maybeSingle()
  if (!target) {
    return NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 404 })
  }
  if (target.deleted_at) {
    return NextResponse.json({
      error: '탈퇴한 회원의 정보는 수정할 수 없습니다 (개인정보 동결)',
    }, { status: 409 })
  }

  try {
    const body = await request.json()
    const { name, email, phone, company, password } = body as {
      name?: string
      email?: string
      phone?: string
      company?: string
      password?: string
    }

    // 간단한 포맷 검증 (admin 페이지지만 방어적으로)
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        return NextResponse.json({ error: '올바르지 않은 이메일 형식입니다' }, { status: 400 })
      }
    }
    // 길이 bounds — DB 과다 저장 및 후속 렌더링 장애 방지
    if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
      return NextResponse.json({ error: '이름은 100자 이하여야 합니다' }, { status: 400 })
    }
    if (phone !== undefined && (typeof phone !== 'string' || phone.length > 50)) {
      return NextResponse.json({ error: '전화번호는 50자 이하여야 합니다' }, { status: 400 })
    }
    if (company !== undefined && (typeof company !== 'string' || company.length > 200)) {
      return NextResponse.json({ error: '회사명은 200자 이하여야 합니다' }, { status: 400 })
    }
    if (password !== undefined) {
      if (typeof password !== 'string' || password.length > 128) {
        return NextResponse.json({ error: '비밀번호 형식이 올바르지 않습니다' }, { status: 400 })
      }
      const result = validatePassword(password, email || target.email || undefined)
      if (!result.valid) {
        return NextResponse.json({ error: result.errors[0] || '비밀번호가 보안 기준을 충족하지 않습니다' }, { status: 400 })
      }
    }

    // 2. 이메일/비밀번호 변경 시 auth.users 를 먼저 업데이트 — profiles 와 divergence 방지.
    //    auth.users 가 unique/포맷 제약 때문에 실패하면 profiles 는 건드리지 않는다.
    const authUpdate: Record<string, string | boolean> = {}
    if (email !== undefined && email) {
      authUpdate.email = email
      authUpdate.email_confirm = true
    }
    if (password !== undefined) {
      authUpdate.password = password
    }
    let effectiveMemberId = id
    if (Object.keys(authUpdate).length > 0) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authUpdate),
      })
      if (!res.ok) {
        const err = await res.text()
        if (password !== undefined && isMissingAuthUserLoadFailure(err)) {
          const repaired = await repairMissingAuthUser(
            service as unknown as RepairClient,
            id,
            target as ProfileSnapshot,
            email || target.email || '',
            password,
          )
          if (!repaired.ok) {
            return NextResponse.json({
              error: `회원 Auth 계정 복구 실패: ${repaired.error}`,
            }, { status: 500 })
          }
          effectiveMemberId = repaired.userId
        } else {
          return NextResponse.json({
            error: `회원 인증정보 변경 실패: ${parseAuthErrorMessage(err)}`,
          }, { status: 500 })
        }
      }
    }

    // 3. profiles 업데이트
    const profileUpdate: Record<string, string | number | null> = {}
    if (name !== undefined) profileUpdate.name = name || null
    if (phone !== undefined) profileUpdate.phone = phone || null
    if (company !== undefined) profileUpdate.company = company || null
    if (email !== undefined) profileUpdate.email = email
    if (password !== undefined) {
      profileUpdate.login_failed_count = 0
      profileUpdate.login_locked_until = null
    }

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profErr } = await service
        .from('profiles')
        .update(profileUpdate)
        .eq('id', effectiveMemberId)
      if (profErr) {
        return NextResponse.json({ error: `프로필 수정 실패: ${profErr.message}` }, { status: 500 })
      }
    }

    // 4. 업데이트된 프로필 반환
    const { data: updated } = await service
      .from('profiles')
      .select('id, email, name, phone, company, role, admin_memo, reward_balance, created_at')
      .eq('id', effectiveMemberId)
      .single()

    return NextResponse.json({ data: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
