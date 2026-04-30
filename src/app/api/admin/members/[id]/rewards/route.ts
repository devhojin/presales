import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { grantRewardPoints } from '@/lib/reward-points'

interface AdminMemoEntry {
  content: string
  created_at: string
  admin_name: string
  type?: string
  amount?: number
}

function parseAdminMemos(raw: string | null): AdminMemoEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as AdminMemoEntry[]
  } catch {
    if (raw.trim()) {
      return [{ content: raw.trim(), created_at: new Date().toISOString(), admin_name: '관리자' }]
    }
  }
  return []
}

function extractRewardGrantMemos(raw: string | null): AdminMemoEntry[] {
  return parseAdminMemos(raw)
    .filter((memo) => memo.type === 'reward_grant')
    .reverse()
    .slice(0, 10)
}

async function getAdminContext() {
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

  const { data: admin } = await service
    .from('profiles')
    .select('id, role, name, email')
    .eq('id', user.id)
    .single()

  if (admin?.role !== 'admin') {
    return { response: NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 }) }
  }

  return { service, admin }
}

async function loadRewardSnapshot(service: SupabaseClient, memberId: string) {
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('id, reward_balance, admin_memo')
    .eq('id', memberId)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }
  if (!profile) {
    return { response: NextResponse.json({ error: '회원을 찾을 수 없습니다' }, { status: 404 }) }
  }

  const { data: ledger, error: ledgerError } = await service
    .from('reward_point_ledger')
    .select('id, amount, balance_after, type, status, memo, created_at')
    .eq('user_id', memberId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (ledgerError) {
    return { response: NextResponse.json({ error: ledgerError.message }, { status: 500 }) }
  }

  return {
    snapshot: {
      balance: Math.max(0, Number(profile.reward_balance ?? 0)),
      ledger: ledger ?? [],
      grantMemos: extractRewardGrantMemos(profile.admin_memo),
      adminMemo: profile.admin_memo,
    },
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const context = await getAdminContext()
  if ('response' in context) return context.response

  const result = await loadRewardSnapshot(context.service, id)
  if ('response' in result) return result.response

  return NextResponse.json(result.snapshot)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const context = await getAdminContext()
  if ('response' in context) return context.response

  const body = (await request.json().catch(() => ({}))) as { amount?: unknown; memo?: unknown }
  const amount = Math.floor(Number(body.amount))
  const memo = typeof body.memo === 'string' ? body.memo.trim() : ''

  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return NextResponse.json({ error: '지급액은 1원 이상의 정수여야 합니다' }, { status: 400 })
  }
  if (memo.length < 2) {
    return NextResponse.json({ error: '관리자 메모를 2자 이상 입력해주세요' }, { status: 400 })
  }
  if (memo.length > 500) {
    return NextResponse.json({ error: '관리자 메모는 500자 이하여야 합니다' }, { status: 400 })
  }

  const before = await loadRewardSnapshot(context.service, id)
  if ('response' in before) return before.response

  const result = await grantRewardPoints(context.service, {
    userId: id,
    amount,
    type: 'admin_adjust',
    sourceKey: `admin_adjust:${id}:${randomUUID()}`,
    memo: '관리자 지급 적립금',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason ?? '적립금 지급에 실패했습니다' }, { status: 500 })
  }

  const adminMemoEntry: AdminMemoEntry = {
    type: 'reward_grant',
    amount,
    content: `적립금 ${amount.toLocaleString('ko-KR')}원 지급: ${memo}`,
    created_at: new Date().toISOString(),
    admin_name: context.admin?.name || context.admin?.email || '관리자',
  }
  const existingMemos = parseAdminMemos(before.snapshot.adminMemo)
  const updatedMemos = [...existingMemos, adminMemoEntry].slice(-100)
  const { error: memoError } = await context.service
    .from('profiles')
    .update({ admin_memo: JSON.stringify(updatedMemos) })
    .eq('id', id)

  const after = await loadRewardSnapshot(context.service, id)
  if ('response' in after) return after.response

  return NextResponse.json({
    ...after.snapshot,
    warning: memoError ? `적립금은 지급됐지만 관리자 메모 저장에 실패했습니다: ${memoError.message}` : null,
  })
}
