import { NextRequest, NextResponse } from 'next/server'
import { fetchAllCommunityPosts } from '@/lib/fetch-community-posts'
import { cleanupOldFeeds } from '@/lib/cleanup-old-feeds'

/**
 * Scheduled cron route: Fetch IT feeds + 3주 지난 RSS 포스트 자동 삭제
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

    // 수집 완료 후 3주 지난 RSS 포스트 정리 (북마크는 스냅샷으로 보존)
    let cleanup: Awaited<ReturnType<typeof cleanupOldFeeds>> | null = null
    try {
      cleanup = await cleanupOldFeeds(21)
    } catch (e) {
      console.error('cleanupOldFeeds 실패 (수집은 성공):', e)
    }

    return NextResponse.json({
      success: true,
      message,
      results,
      summary: { totalInserted, totalSkipped, totalBlocked },
      cleanup,
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
