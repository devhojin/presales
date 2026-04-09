import { createClient } from '@supabase/supabase-js'
import { fetchAllAnnouncements } from '@/lib/fetch-announcements'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Cron handler: Fetch announcements from K-Startup API
 * Called by Vercel CRON_SECRET
 * Max duration: 60 seconds
 */
export async function GET(request: NextRequest) {
  // 1. Auth: Check CRON_SECRET header
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  try {
    // 2. Service role client for DB operations
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // 3. Fetch all announcements (K-Startup API)
    const fetchResult = await fetchAllAnnouncements()

    // 4. Mark expired announcements as closed
    const today = new Date().toISOString().split('T')[0]
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ status: 'closed' })
      .lt('end_date', today)
      .eq('status', 'active')

    if (updateError) {
      console.error('Failed to mark expired announcements:', updateError)
    }

    // 5. Return summary
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: fetchResult.results,
      summary: {
        totalInserted: fetchResult.totalInserted,
        totalSkipped: fetchResult.totalSkipped,
        totalBlocked: fetchResult.totalBlocked,
        expiredMarked: true,
      },
    })
  } catch (error) {
    console.error('Cron fetch error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류',
      },
      { status: 500 }
    )
  }
}
