import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function redactPreviewUrl<T extends { preview_pdf_url?: string | null }>(product: T) {
  return {
    ...product,
    has_preview_pdf: Boolean(product.preview_pdf_url),
    preview_pdf_url: null,
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const productId = Number(id)

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: '잘못된 상품 ID입니다.' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: '상품 조회 설정이 없습니다.' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await supabase
    .from('products')
    .select('*, categories!products_category_id_fkey(id, name, slug)')
    .eq('id', productId)
    .eq('is_published', true)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다.' }, { status: 404 })
  }

  return NextResponse.json({ product: redactPreviewUrl(data) })
}
