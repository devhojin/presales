import { NextResponse } from 'next/server'
import { listPublicMorningBriefs } from '@/lib/public-briefs-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const briefs = await listPublicMorningBriefs(365)

    return NextResponse.json(
      { ok: true, briefs },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : '브리프 로드 실패'
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500, headers: { 'Cache-Control': 'no-store' } },
    )
  }
}
