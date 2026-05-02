import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

export const runtime = 'nodejs'

const MAX_PREVIEW_PAGES = 20

function getRequestedPages(request: NextRequest) {
  const rawPages = Number(request.nextUrl.searchParams.get('pages') || MAX_PREVIEW_PAGES)
  if (!Number.isFinite(rawPages)) return MAX_PREVIEW_PAGES
  return Math.min(Math.max(Math.floor(rawPages), 1), MAX_PREVIEW_PAGES)
}

export async function GET(request: NextRequest) {
  const productId = Number(request.nextUrl.searchParams.get('productId'))
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const requestedPages = getRequestedPages(request)

  if (!Number.isInteger(productId) || productId <= 0) {
    return NextResponse.json({ error: '상품 정보가 없습니다.' }, { status: 400 })
  }

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'PDF 미리보기 설정이 없습니다.' }, { status: 500 })
  }

  let target: URL
  let allowedOrigin: string
  try {
    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, is_published, preview_pdf_url')
      .eq('id', productId)
      .eq('is_published', true)
      .single()

    if (productError || !product?.preview_pdf_url) {
      return NextResponse.json({ error: 'PDF 미리보기가 없습니다.' }, { status: 404 })
    }

    target = new URL(product.preview_pdf_url)
    allowedOrigin = new URL(supabaseUrl).origin
  } catch {
    return NextResponse.json({ error: '유효하지 않은 PDF 미리보기입니다.' }, { status: 400 })
  }

  const isAllowedPreviewPdf =
    target.origin === allowedOrigin &&
    target.pathname.startsWith('/storage/v1/object/public/product-previews/') &&
    decodeURIComponent(target.pathname).toLowerCase().endsWith('.pdf')

  if (!isAllowedPreviewPdf) {
    return NextResponse.json({ error: '허용되지 않은 PDF URL입니다.' }, { status: 403 })
  }

  const upstream = await fetch(target.toString(), {
    headers: { Accept: 'application/pdf' },
    cache: 'force-cache',
    next: { revalidate: 3600 },
  })

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: 'PDF 파일을 불러올 수 없습니다.' },
      { status: upstream.status || 502 }
    )
  }

  const sourceBytes = new Uint8Array(await upstream.arrayBuffer())
  const sourcePdf = await PDFDocument.load(sourceBytes)
  const sourcePageCount = sourcePdf.getPageCount()
  const previewPageCount = Math.min(requestedPages, sourcePageCount, MAX_PREVIEW_PAGES)

  if (previewPageCount < 1) {
    return NextResponse.json(
      { error: '미리보기 페이지가 없습니다.' },
      { status: 422 }
    )
  }

  const previewPdf = await PDFDocument.create()
  const copiedPages = await previewPdf.copyPages(
    sourcePdf,
    Array.from({ length: previewPageCount }, (_, index) => index)
  )
  copiedPages.forEach((page) => previewPdf.addPage(page))
  const previewBytes = await previewPdf.save()

  return new NextResponse(Buffer.from(previewBytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="preview-pages.pdf"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
      'X-Preview-Page-Count': String(previewPageCount),
      'X-Source-Page-Count': String(sourcePageCount),
      'X-Preview-Page-Limit': String(MAX_PREVIEW_PAGES),
    },
  })
}
