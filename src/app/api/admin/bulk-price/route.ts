import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// GET: 현재 가격 목록 조회
export async function GET() {
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
  if (authError || !user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })

  // Admin check
  const { data: profile, error: profileError } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profileError || profile?.role !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const { data, error } = await supabase
    .from('products')
    .select('id, title, price, original_price, is_free, is_published')
    .order('id')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ products: data })
}

// POST: 가격 일괄 수정
export async function POST(request: NextRequest) {
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

  const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
  if (authErr || !user) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, { auth: { persistSession: false } })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })

  const body = await request.json()
  const updates: { id: number; price: number; original_price: number }[] = body.updates

  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: '수정할 항목이 없습니다' }, { status: 400 })
  }

  const results: { id: number; success: boolean; error?: string }[] = []

  for (const item of updates) {
    if (!item.id || item.price < 0 || item.original_price < 0) {
      results.push({ id: item.id, success: false, error: '잘못된 값' })
      continue
    }

    const { error } = await supabase
      .from('products')
      .update({ price: item.price, original_price: item.original_price })
      .eq('id', item.id)

    results.push({ id: item.id, success: !error, error: error?.message })
  }

  const successCount = results.filter(r => r.success).length
  return NextResponse.json({ message: `${successCount}/${updates.length}개 수정 완료`, results })
}
