import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { markMemberMemoRead } from '@/lib/admin-read-state'
import { logger } from '@/lib/logger'

async function getAdminService() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) {
    return { response: NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 }) }
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  const { data: me } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (me?.role !== 'admin') {
    return { response: NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 }) }
  }

  return { service }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAdminService()
    if ('response' in context) return context.response

    const body = (await request.json().catch(() => ({}))) as { memberIds?: unknown }
    const ids = Array.isArray(body.memberIds)
      ? Array.from(new Set(body.memberIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
      : []

    if (ids.length === 0) {
      return NextResponse.json({ error: '읽음 처리할 회원이 없습니다' }, { status: 400 })
    }
    if (ids.length > 200) {
      return NextResponse.json({ error: '한 번에 최대 200명까지 처리 가능합니다' }, { status: 400 })
    }

    const readAt = new Date().toISOString()
    const { service } = context
    const { data: members, error: fetchError } = await service
      .from('profiles')
      .select('id, admin_memo')
      .in('id', ids)

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    const results = await Promise.all(
      (members || []).map((member) =>
        service
          .from('profiles')
          .update({ admin_memo: markMemberMemoRead(member.admin_memo, readAt) })
          .eq('id', member.id),
      ),
    )

    const failed = results.find((result) => result.error)
    if (failed?.error) {
      return NextResponse.json({ error: failed.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, readAt, memberIds: (members || []).map((member) => member.id) })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류'
    logger.error('회원 읽음 처리 실패', 'admin/members/read', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
