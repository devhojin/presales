import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/** GET: 내 피드 북마크 목록 */
export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('feed_bookmarks')
    .select('post_id, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bookmarks: data })
}

/** POST: 피드 북마크 토글 */
export async function POST(request: NextRequest) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { post_id } = await request.json()
  if (!post_id) return NextResponse.json({ error: 'post_id 필요' }, { status: 400 })

  const supabase = getServiceClient()

  const { data: existing } = await supabase
    .from('feed_bookmarks')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', post_id)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('feed_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', post_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bookmarked: false })
  } else {
    const { error } = await supabase
      .from('feed_bookmarks')
      .insert({ user_id: user.id, post_id })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ bookmarked: true })
  }
}
