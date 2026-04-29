import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchCentralBriefStatus, presalesServiceClient } from '@/lib/morning-brief-platform'

export const runtime = 'nodejs'

async function requireAdmin() {
  const cookieStore = await cookies()
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    },
  )
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return { ok: false as const, response: NextResponse.json({ ok: false, error: '로그인이 필요합니다' }, { status: 401 }) }

  const service = presalesServiceClient()
  const { data: me } = await service.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (me?.role !== 'admin') {
    return { ok: false as const, response: NextResponse.json({ ok: false, error: '관리자만 접근 가능합니다' }, { status: 403 }) }
  }
  return { ok: true as const, service }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { data, error } = await auth.service
    .from('brief_subscribers')
    .select('id, email, name, source, status, subscribed_at, unsubscribed_at, last_sent_at, send_count')
    .order('subscribed_at', { ascending: false })
    .limit(1000)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = data ?? []
  const centralStatuses = await Promise.all(
    rows.slice(0, 200).map(async (row) => ({
      email: row.email,
      central: await fetchCentralBriefStatus(row.email),
    })),
  )
  const centralByEmail = new Map(centralStatuses.map((item) => [item.email, item.central]))

  return NextResponse.json({
    ok: true,
    records: rows.map((row) => ({
      ...row,
      local_site: 'presales',
      central: centralByEmail.get(row.email) ?? null,
    })),
  })
}
