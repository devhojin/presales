import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

function authorized(req: NextRequest): boolean {
  const got = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!got) return false

  const allowedSecrets = [process.env.MB_CRON_SECRET, process.env.CRON_SECRET]
    .filter((secret): secret is string => Boolean(secret))

  return allowedSecrets.includes(got)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: '인증 실패' }, { status: 401 })
  }

  return NextResponse.json({
    success: true,
    skipped: true,
    deprecated: true,
    reason: 'legacy send-brief cron is disabled; central morning-brief cron handles delivery',
  })
}

export const POST = GET
