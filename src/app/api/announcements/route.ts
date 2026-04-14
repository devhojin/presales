import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Public Announcements API
 * GET: List published announcements
 * - Returns: { announcements, total }
 * - Orders by end_date ASC (soonest deadline first), then created_at DESC
 * - Query params: page, pageSize, search, area (support_areas), status ('active'|'closed'|'all')
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const search = searchParams.get('search') || ''
  const area = searchParams.get('area') || '' // support_areas filter
  const status = searchParams.get('status') || 'all' // active | closed | all

  try {
    // Service client for public data access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )

    // Base: published only
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })
      .eq('is_published', true)

    if (status === 'active' || status === 'closed') {
      query = query.eq('status', status)
    }

    // Search filter (title, organization, description)
    if (search) {
      query = query.or(`title.ilike.%${search}%,organization.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // Area filter (support_areas is a text array)
    if (area) {
      query = query.contains('support_areas', [area])
    }

    // Pagination
    const offset = (page - 1) * pageSize
    const { data: announcements, error: queryError, count: total } = await query
      .order('end_date', { ascending: true })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    return NextResponse.json({
      announcements: announcements || [],
      total: total || 0,
      page,
      pageSize,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
