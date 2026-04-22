import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * PATCH /api/admin/members/[id]
 * 관리자가 회원 정보를 수정 (이름, 이메일, 전화번호, 회사)
 * 이메일 변경 시 auth.users 도 함께 업데이트
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
    .select('deleted_at')
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
    const { name, email, phone, company } = body as {
      name?: string
      email?: string
      phone?: string
      company?: string
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

    // 2. 이메일 변경 시 auth.users 를 먼저 업데이트 — profiles 와 divergence 방지.
    //    auth.users 가 unique/포맷 제약 때문에 실패하면 profiles 는 건드리지 않는다.
    if (email !== undefined && email) {
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${id}`
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, email_confirm: true }),
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `이메일 변경 실패: ${err}` }, { status: 500 })
      }
    }

    // 3. profiles 업데이트
    const profileUpdate: Record<string, string | null> = {}
    if (name !== undefined) profileUpdate.name = name || null
    if (phone !== undefined) profileUpdate.phone = phone || null
    if (company !== undefined) profileUpdate.company = company || null
    if (email !== undefined) profileUpdate.email = email

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profErr } = await service
        .from('profiles')
        .update(profileUpdate)
        .eq('id', id)
      if (profErr) {
        return NextResponse.json({ error: `프로필 수정 실패: ${profErr.message}` }, { status: 500 })
      }
    }

    // 4. 업데이트된 프로필 반환
    const { data: updated } = await service
      .from('profiles')
      .select('id, email, name, phone, company, role, admin_memo, created_at')
      .eq('id', id)
      .single()

    return NextResponse.json({ data: updated })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
