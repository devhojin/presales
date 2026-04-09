import { NextRequest, NextResponse } from 'next/server'
import { fetchAllCommunityPosts } from '@/lib/fetch-community-posts'

/**
 * Scheduled cron route: Fetch IT feeds
 * GET /api/cron/fetch-feeds
 * Auth: Bearer token (CRON_SECRET)
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { results, totalInserted, totalSkipped, totalBlocked, message } =
      await fetchAllCommunityPosts()

    return NextResponse.json({
      success: true,
      message,
      results,
      summary: { totalInserted, totalSkipped, totalBlocked },
      timestamp: new Date().toISOString(),
    })
  } catch (e: unknown) {
    console.error('Cron fetch-feeds error:', e)
    return NextResponse.json(
      {
        error: '수집 중 오류 발생',
        detail: e instanceof Error ? e.message : String(e),
      },
      { status: 500 }
    )
  }
}
