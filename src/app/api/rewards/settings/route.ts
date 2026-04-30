import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { loadRewardSettings } from '@/lib/reward-points'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const settings = await loadRewardSettings(supabase)

  return NextResponse.json(
    {
      enabled: settings.enabled,
      signupBonus: settings.signupBonus,
      reviewBonus: settings.reviewBonus,
      purchaseRatePercent: settings.purchaseRatePercent,
      useLimitPerOrder: settings.useLimitPerOrder,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  )
}
