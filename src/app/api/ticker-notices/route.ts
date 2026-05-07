import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  DEFAULT_TICKER_NOTICE,
  getVisibleTickerNotices,
  parseTickerNotices,
  TICKER_NOTICES_SETTING_KEY,
} from '@/lib/ticker-notices'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export async function GET() {
  const service = getServiceClient()
  const { data, error } = await service
    .from('site_settings')
    .select('value')
    .eq('key', TICKER_NOTICES_SETTING_KEY)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ notices: [DEFAULT_TICKER_NOTICE], error: '티커 공지를 불러오지 못했습니다' }, { status: 200 })
  }

  const notices = data
    ? parseTickerNotices(data.value)
    : [DEFAULT_TICKER_NOTICE]

  return NextResponse.json({ notices: getVisibleTickerNotices(notices) })
}
