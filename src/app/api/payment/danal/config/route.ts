import { NextResponse } from 'next/server'
import { getDanalCardConfig } from '@/lib/danal-card'

export const dynamic = 'force-dynamic'

export async function GET() {
  const config = getDanalCardConfig()

  return NextResponse.json(
    {
      enabled: config.enabled,
      provider: 'danal-card',
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  )
}
