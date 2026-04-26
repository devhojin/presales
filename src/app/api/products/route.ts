import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Public API: Get paginated published products
 * GET /api/products?page=1&limit=12&category=1,2&sort=recommended&q=keyword&fileType=PPT&priceRange=free
 */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams

  const page = Math.max(1, Number(sp.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(sp.get('limit')) || 12))
  const categoryParam = sp.get('category') || ''
  const sort = sp.get('sort') || 'recommended'
  const q = sp.get('q') || ''
  const fileType = sp.get('fileType') || ''
  const priceRange = sp.get('priceRange') || '' // free | under50k | 50k_100k | over100k
  const price = sp.get('price') || '' // free | paid (free/paid toggle, separate from priceRange)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_published', true)

  // Category filter — products have category_ids (array) and category_id (single)
  // We use the @> (contains) operator for array overlap via Supabase .overlaps()
  if (categoryParam) {
    const catIds = categoryParam.split(',').map(Number).filter((n) => !isNaN(n) && n > 0)
    if (catIds.length > 0) {
      // overlaps: category_ids && ARRAY[...] OR category_id IN (...)
      // Supabase JS doesn't support OR across columns directly in a single filter,
      // so we use the filter with cs (contains) on the array column
      // and fall back to category_id for old single-column products.
      // We use .or() with PostgREST filter syntax:
      const orParts = [
        `category_ids.ov.{${catIds.join(',')}}`,
        `category_id.in.(${catIds.join(',')})`,
      ].join(',')
      query = query.or(orParts)
    }
  }

  // Search filter
  if (q) {
    const escaped = q.replace(/[%_]/g, '\\$&')
    query = query.or(`title.ilike.%${escaped}%,description.ilike.%${escaped}%`)
  }

  // File type filter — format is a text field containing file extension names
  if (fileType) {
    const ext = fileType.toUpperCase()
    // PPT includes PPTX, XLS includes XLSX, DOC includes DOCX
    const variants: Record<string, string[]> = {
      PPT: ['PPT', 'PPTX'],
      XLS: ['XLS', 'XLSX'],
      DOC: ['DOC', 'DOCX'],
    }
    const exts = variants[ext] ?? [ext]
    const orParts = exts.map((e) => `format.ilike.%${e}%`).join(',')
    query = query.or(orParts)
  }

  // Free/paid toggle filter
  if (price === 'free') {
    query = query.eq('is_free', true)
  } else if (price === 'paid') {
    query = query.eq('is_free', false)
  }

  // Price range filter (more granular, overrides is_free portion if both set)
  if (priceRange === 'free') {
    query = query.eq('is_free', true)
  } else if (priceRange === 'under50k') {
    query = query.eq('is_free', false).lte('price', 50000)
  } else if (priceRange === '50k_100k') {
    query = query.eq('is_free', false).gt('price', 50000).lte('price', 100000)
  } else if (priceRange === 'over100k') {
    query = query.eq('is_free', false).gt('price', 100000)
  }

  // Sort
  if (sort === 'price_asc') {
    query = query.order('price', { ascending: true })
  } else if (sort === 'price_desc') {
    query = query.order('price', { ascending: false })
  } else if (sort === 'newest') {
    query = query.order('created_at', { ascending: false })
  } else {
    // recommended: sort_order first (nulls last), then newest
    query = query
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
  }

  const offset = (page - 1) * limit
  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    products: data ?? [],
    total: count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((count ?? 0) / limit),
  })
}
