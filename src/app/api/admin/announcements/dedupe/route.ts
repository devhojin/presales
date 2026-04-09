import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  // Auth
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
  const { data: { user } } = await supabaseAuth.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: '관리자 권한 필요' }, { status: 403 })

  // 1. 모든 공고 가져오기 (external_id 기준)
  const { data: all, error } = await supabase
    .from('announcements')
    .select('id, external_id, title, created_at')
    .order('created_at', { ascending: true })

  if (error || !all) return NextResponse.json({ error: error?.message || '조회 실패' }, { status: 500 })

  // 2. external_id 기준 중복 찾기 (같은 external_id에 여러 행)
  const groups = new Map<string, typeof all>()
  for (const row of all) {
    const key = row.external_id || `title:${row.title}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(row)
  }

  // 3. 중복 그룹에서 가장 오래된 것만 남기고 나머지 삭제
  const toDelete: string[] = []
  let dupGroups = 0
  for (const [, rows] of groups) {
    if (rows.length <= 1) continue
    dupGroups++
    // 첫 번째(가장 오래된) 것은 유지, 나머지 삭제
    for (let i = 1; i < rows.length; i++) {
      toDelete.push(rows[i].id)
    }
  }

  // 4. 삭제 실행
  let deleted = 0
  if (toDelete.length > 0) {
    // batch delete (100개씩)
    for (let i = 0; i < toDelete.length; i += 100) {
      const batch = toDelete.slice(i, i + 100)
      const { error: delErr } = await supabase.from('announcements').delete().in('id', batch)
      if (!delErr) deleted += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    message: `중복 ${dupGroups}그룹에서 ${deleted}건 삭제 완료 (총 ${all.length}건 → ${all.length - deleted}건)`,
    totalBefore: all.length,
    totalAfter: all.length - deleted,
    duplicateGroups: dupGroups,
    deleted,
  })
}
