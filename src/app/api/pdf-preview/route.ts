import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url')
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!rawUrl || !supabaseUrl) {
    return NextResponse.json({ error: 'PDF URL이 없습니다.' }, { status: 400 })
  }

  let target: URL
  let allowedOrigin: string
  try {
    target = new URL(rawUrl)
    allowedOrigin = new URL(supabaseUrl).origin
  } catch {
    return NextResponse.json({ error: '유효하지 않은 PDF URL입니다.' }, { status: 400 })
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

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') || 'application/pdf',
      'Content-Disposition': 'inline; filename="preview.pdf"',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
