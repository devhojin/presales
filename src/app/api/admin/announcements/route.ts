import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin Announcements API
 * - GET: List announcements with pagination, search, filters
 * - PATCH: Update single announcement
 * - DELETE: Delete announcement(s)
 */

// Helper: Auth check
async function getAdminAuth() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(c) { try { c.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {} },
      },
    }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return { error: 'unauthorized', user: null, supabase: null }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return { error: 'forbidden', user: null, supabase: null }
  }

  return { error: null, user, supabase }
}

// GET: List announcements with pagination, search, filters
export async function GET(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      { error: error === 'unauthorized' ? '로그인이 필요합니다' : '관리자 권한이 필요합니다' },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all' // all/active/closed
  const published = searchParams.get('published') || 'all' // all/true/false
  const source = searchParams.get('source') || '' // K-Startup, etc.

  try {
    let query = supabase!.from('announcements').select('*', { count: 'exact' })

    // Status filter
    if (status === 'active') {
      query = query.eq('status', 'active')
    } else if (status === 'closed') {
      query = query.eq('status', 'closed')
    }

    // Published filter
    if (published === 'true') {
      query = query.eq('is_published', true)
    } else if (published === 'false') {
      query = query.eq('is_published', false)
    }

    // Source filter
    if (source) {
      query = query.eq('source', source)
    }

    // Search filter (title, organization, description)
    if (search) {
      // ilike 패턴 문자(%, _) 이스케이프 → DoS 유발 패턴 남용 방지
      const safe = search.replace(/[%_\\]/g, (m) => '\\' + m)
      query = query.or(`title.ilike.%${safe}%,organization.ilike.%${safe}%,description.ilike.%${safe}%`)
    }

    // Pagination
    const offset = (page - 1) * pageSize
    const { data: announcements, error: queryError, count: total } = await query
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

// PATCH: Update single or bulk announcements
export async function PATCH(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      { error: error === 'unauthorized' ? '로그인이 필요합니다' : '관리자 권한이 필요합니다' },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  try {
    const body = await request.json()
    const { id, ids, ...updates } = body

    // Determine if single or bulk update
    const updateIds = ids ? (Array.isArray(ids) ? ids.map(x => String(x)) : [String(ids)]) : id ? [String(id)] : []
    if (updateIds.length === 0) {
      return NextResponse.json({ error: '공고 ID가 필요합니다' }, { status: 400 })
    }

    // Allowed fields to update
    const allowedFields = [
      'is_published',
      'title',
      'organization',
      'description',
      'type',
      'budget',
      'start_date',
      'end_date',
      'application_method',
      'target',
      'eligibility',
      'department',
      'contact',
      'source_url',
      'field',
      'status',
      'matching_keywords',
      'support_areas',
      'regions',
      'target_types',
      'age_ranges',
      'business_years',
      'governing_body',
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: '수정할 필드가 없습니다' }, { status: 400 })
    }

    // Bulk update
    const { error: updateError } = await supabase!
      .from('announcements')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .in('id', updateIds)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log changes for each updated announcement
    const { data: announcements } = await supabase!
      .from('announcements')
      .select('id, title')
      .in('id', updateIds)

    if (announcements && announcements.length > 0) {
      const logs = announcements.map(ann => ({
        action: 'updated',
        announcement_id: ann.id,
        announcement_title: ann.title || '',
        detail: `수정됨: ${Object.keys(filteredUpdates).join(', ')}`,
      }))
      await supabase!.from('announcement_logs').insert(logs)
    }

    return NextResponse.json({ success: true, updated: updateIds.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}

// DELETE: Delete announcement(s)
export async function DELETE(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      { error: error === 'unauthorized' ? '로그인이 필요합니다' : '관리자 권한이 필요합니다' },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  try {
    const body = await request.json()
    const { ids = [], permanent = false } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: '삭제할 공고 ID가 필요합니다' }, { status: 400 })
    }

    const numIds = ids.map(id => Number(id)).filter(id => !isNaN(id))
    if (numIds.length === 0) {
      return NextResponse.json({ error: '유효한 ID가 없습니다' }, { status: 400 })
    }

    // Get announcements for logging
    const { data: announcements } = await supabase!
      .from('announcements')
      .select('id, title, external_id')
      .in('id', numIds)

    // Delete from announcements table
    const { error: deleteError } = await supabase!
      .from('announcements')
      .delete()
      .in('id', numIds)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // If permanent, add to blocked_announcements
    if (permanent && announcements) {
      const blockedRows = announcements
        .filter(a => a.external_id)
        .map(a => ({
          external_id: a.external_id,
          reason: '관리자 영구 삭제',
        }))

      if (blockedRows.length > 0) {
        await supabase!.from('blocked_announcements').insert(blockedRows)
      }
    }

    // Log deletions
    for (const announcement of announcements || []) {
      await supabase!.from('announcement_logs').insert({
        action: 'deleted',
        announcement_id: announcement.id,
        announcement_title: announcement.title || '',
        detail: permanent ? '영구 삭제됨' : '삭제됨',
      })
    }

    return NextResponse.json({
      success: true,
      deleted: numIds.length,
      permanent,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
