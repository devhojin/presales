import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Admin Feeds API
 * - GET: List community posts with pagination, search, filters (admin auth required)
 * - PATCH: Update single post (is_published, title, category, content, etc.)
 * - DELETE: Delete post(s), with permanent option (add to blocked_community_posts)
 */

// Helper: Auth check
async function getAdminAuth() {
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(c) {
          try {
            c.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
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

// GET: List community posts with pagination, search, filters
export async function GET(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      {
        error:
          error === 'unauthorized'
            ? '로그인이 필요합니다'
            : '관리자 권한이 필요합니다',
      },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || 'all'
  const published = searchParams.get('published') || 'all'
  const source = searchParams.get('source') || ''

  try {
    let query = supabase!.from('community_posts').select('*', { count: 'exact' })

    // Category filter
    if (category !== 'all') {
      query = query.eq('category', category)
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

    // Search filter (title, content, author_name)
    if (search) {
      query = query.or(
        `title.ilike.%${search}%,content.ilike.%${search}%,author_name.ilike.%${search}%`
      )
    }

    // Pagination
    const offset = (page - 1) * pageSize
    const { data: posts, error: queryError, count: total } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (queryError) {
      return NextResponse.json({ error: queryError.message }, { status: 500 })
    }

    // Count by tab
    const { data: counts } = await supabase!
      .from('community_posts')
      .select('is_published, category', { count: 'exact' })

    const countByTab = {
      all: total || 0,
      published:
        counts?.filter(c => c.is_published === true).length || 0,
      unpublished:
        counts?.filter(c => c.is_published === false).length || 0,
    }

    return NextResponse.json({
      posts: posts || [],
      total: total || 0,
      page,
      pageSize,
      counts: countByTab,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}

// PATCH: Update single post
export async function PATCH(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      {
        error:
          error === 'unauthorized'
            ? '로그인이 필요합니다'
            : '관리자 권한이 필요합니다',
      },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  try {
    const body = await request.json()
    const { id, ids, ...updates } = body

    // Determine if single or bulk update
    const updateIds = ids
      ? Array.isArray(ids)
        ? ids.map(x => String(x))
        : [String(ids)]
      : id
        ? [String(id)]
        : []

    if (updateIds.length === 0) {
      return NextResponse.json(
        { error: '게시글 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Allowed fields to update
    const allowedFields = [
      'is_published',
      'title',
      'category',
      'content',
      'author_name',
      'author_role',
      'author_avatar',
      'status',
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = value
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: '수정할 필드가 없습니다' },
        { status: 400 }
      )
    }

    // Bulk update
    const { error: updateError } = await supabase!
      .from('community_posts')
      .update({ ...filteredUpdates, updated_at: new Date().toISOString() })
      .in('id', updateIds)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Log changes for each updated post
    const { data: posts } = await supabase!
      .from('community_posts')
      .select('id, title')
      .in('id', updateIds)

    if (posts && posts.length > 0) {
      const logs = posts.map(post => ({
        action: 'updated',
        post_id: post.id,
        post_title: post.title || '',
        detail: `수정됨: ${Object.keys(filteredUpdates).join(', ')}`,
      }))
      await supabase!.from('feed_logs').insert(logs)
    }

    return NextResponse.json({ success: true, updated: updateIds.length })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}

// DELETE: Delete post(s)
export async function DELETE(request: NextRequest) {
  const { error, user, supabase } = await getAdminAuth()
  if (error) {
    return NextResponse.json(
      {
        error:
          error === 'unauthorized'
            ? '로그인이 필요합니다'
            : '관리자 권한이 필요합니다',
      },
      { status: error === 'unauthorized' ? 401 : 403 }
    )
  }

  try {
    const body = await request.json()
    const { ids = [], permanent = false } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: '삭제할 게시글 ID가 필요합니다' },
        { status: 400 }
      )
    }

    // Get posts for logging
    const { data: posts } = await supabase!
      .from('community_posts')
      .select('id, title, source, external_id')
      .in('id', ids)

    // Delete from community_posts table
    const { error: deleteError } = await supabase!
      .from('community_posts')
      .delete()
      .in('id', ids)

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // If permanent, add to blocked_community_posts
    if (permanent && posts) {
      const blockedRows = posts
        .filter(p => p.source && p.external_id)
        .map(p => ({
          source: p.source,
          external_id: p.external_id,
          title: p.title,
          reason: '관리자 영구 삭제',
          blocked_by: user?.id,
        }))

      if (blockedRows.length > 0) {
        await supabase!.from('blocked_community_posts').insert(blockedRows)
      }
    }

    // Log deletions
    for (const post of posts || []) {
      await supabase!.from('feed_logs').insert({
        action: 'deleted',
        post_id: post.id,
        post_title: post.title || '',
        detail: permanent ? '영구 삭제됨' : '삭제됨',
      })
    }

    return NextResponse.json({
      success: true,
      deleted: ids.length,
      permanent,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '알 수 없는 오류' },
      { status: 500 }
    )
  }
}
