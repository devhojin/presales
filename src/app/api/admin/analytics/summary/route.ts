import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { getAdminAnalyticsSummary } from '@/lib/admin-analytics'
import type { Database } from '@/lib/database.types'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parsePeriodDays(value: string | null): number {
  const days = Number(value || 7)
  return [7, 30, 90].includes(days) ? days : 7
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )

  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const service = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: me, error: roleError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (roleError) {
    return NextResponse.json({ error: roleError.message }, { status: 500 })
  }

  if (me?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 접근 가능합니다' }, { status: 403 })
  }

  const url = new URL(request.url)
  const periodDays = parsePeriodDays(url.searchParams.get('days'))

  try {
    const summary = await getAdminAnalyticsSummary(service, periodDays)
    return NextResponse.json(summary)
  } catch (error) {
    const message = error instanceof Error ? error.message : '통계 데이터를 불러오지 못했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
