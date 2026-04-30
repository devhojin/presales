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
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    ok: true,
    skipped: true,
    deprecated: true,
    reason: 'presales morning brief collector is disabled; central morning-brief cron handles collection',
  })
}

export const POST = GET
