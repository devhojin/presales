import { NextRequest, NextResponse } from 'next/server'
import { requireAdminService } from '@/lib/require-admin'
import {
  DEFAULT_TICKER_NOTICE,
  parseTickerNotices,
  serializeTickerNotices,
  TICKER_NOTICES_SETTING_KEY,
  type TickerNotice,
} from '@/lib/ticker-notices'

export const dynamic = 'force-dynamic'

function sanitizeNotices(value: unknown): TickerNotice[] {
  return parseTickerNotices(JSON.stringify({ notices: Array.isArray(value) ? value : [] }))
}

export async function GET() {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  const { data, error } = await admin.service
    .from('site_settings')
    .select('value')
    .eq('key', TICKER_NOTICES_SETTING_KEY)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    notices: data ? parseTickerNotices(data.value) : [DEFAULT_TICKER_NOTICE],
  })
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdminService()
  if (!admin.ok) return admin.response

  let body: { notices?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const notices = sanitizeNotices(body.notices)
  if (notices.length > 20) {
    return NextResponse.json({ error: '티커 공지는 최대 20개까지 등록할 수 있습니다' }, { status: 400 })
  }

  const { error } = await admin.service
    .from('site_settings')
    .upsert(
      {
        key: TICKER_NOTICES_SETTING_KEY,
        value: serializeTickerNotices(notices),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' },
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ notices })
}
