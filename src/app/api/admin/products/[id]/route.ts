import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

type DeleteQuery = PromiseLike<{
  error: { message: string } | null
  count: number | null
}>

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const productId = Number(id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: '잘못된 상품 ID입니다' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Route Handler에서 쿠키 갱신이 불가능한 경우는 무시
          }
        },
      },
    },
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } },
  )

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다' }, { status: 403 })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id')
    .eq('id', productId)
    .maybeSingle()

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 })
  }
  if (!product) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
  }

  const cleanupCounts: Record<string, number> = {}
  const runDelete = async (label: string, query: DeleteQuery) => {
    const { error, count } = await query
    if (error) throw new Error(`${label} 삭제 실패: ${error.message}`)
    cleanupCounts[label] = count ?? 0
  }

  try {
    const { data: reviews, error: reviewSelectError } = await supabase
      .from('reviews')
      .select('id')
      .eq('product_id', productId)

    if (reviewSelectError) throw new Error(`리뷰 조회 실패: ${reviewSelectError.message}`)

    const reviewIds = (reviews ?? []).map((review) => review.id)
    if (reviewIds.length > 0) {
      await runDelete(
        'review_helpful',
        supabase.from('review_helpful').delete({ count: 'exact' }).in('review_id', reviewIds),
      )
    } else {
      cleanupCounts.review_helpful = 0
    }

    await runDelete('reviews', supabase.from('reviews').delete({ count: 'exact' }).eq('product_id', productId))
    await runDelete('cart_items', supabase.from('cart_items').delete({ count: 'exact' }).eq('product_id', productId))
    await runDelete('download_logs', supabase.from('download_logs').delete({ count: 'exact' }).eq('product_id', productId))
    await runDelete(
      'product_discount_matches',
      supabase
        .from('product_discount_matches')
        .delete({ count: 'exact' })
        .or(`source_product_id.eq.${productId},target_product_id.eq.${productId}`),
    )
    await runDelete(
      'order_items',
      supabase
        .from('order_items')
        .delete({ count: 'exact' })
        .or(`product_id.eq.${productId},discount_source_product_id.eq.${productId}`),
    )
    await runDelete('product_files', supabase.from('product_files').delete({ count: 'exact' }).eq('product_id', productId))

    const { error: deleteProductError, count: productCount } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .eq('id', productId)

    if (deleteProductError) {
      throw new Error(`상품 삭제 실패: ${deleteProductError.message}`)
    }

    cleanupCounts.products = productCount ?? 0

    return NextResponse.json({ ok: true, cleanupCounts })
  } catch (error) {
    const message = error instanceof Error ? error.message : '상품 삭제 중 오류가 발생했습니다'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
