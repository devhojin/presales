import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  // 1. Supabase Auth로 로그인 유저 확인
  const cookieStore = await cookies()
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서는 무시
          }
        },
      },
    }
  )

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  // 2. 요청 파싱
  let body: { productId?: unknown; fileId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청입니다' }, { status: 400 })
  }

  const productId = Number(body.productId)
  const fileId = body.fileId !== undefined ? Number(body.fileId) : undefined

  if (!productId || isNaN(productId)) {
    return NextResponse.json({ error: '상품 정보가 올바르지 않습니다' }, { status: 400 })
  }

  // Service Role Key로 서버 전용 클라이언트 생성 (클라이언트에 절대 노출 금지)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    logger.error('SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다', 'download')
    return NextResponse.json({ error: '서버 설정 오류입니다' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  // 관리자 여부 (관리자는 미게시/미구매 상품 파일도 바로 다운로드 가능)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.role === 'admin'

  // 3. product 조회 → is_free 확인
  let productQuery = supabase
    .from('products')
    .select('id, is_free, title, download_count')
    .eq('id', productId)
  if (!isAdmin) {
    productQuery = productQuery.eq('is_published', true)
  }
  const { data: product, error: productError } = await productQuery.single()

  if (productError || !product) {
    return NextResponse.json({ error: '상품을 찾을 수 없습니다' }, { status: 404 })
  }

  // 4. 유료 상품: 구매 내역 확인 (관리자는 스킵)
  if (!product.is_free && !isAdmin) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_items!inner(product_id)')
      .eq('user_id', user.id)
      .in('status', ['completed', 'paid'])
      .eq('order_items.product_id', productId)

    if (!orders || orders.length === 0) {
      return NextResponse.json(
        { error: '구매 후 다운로드 가능합니다' },
        { status: 403 }
      )
    }
  }

  // 5. product_files에서 파일 조회
  const filesQuery = supabase
    .from('product_files')
    .select('id, file_name, file_url, file_size')
    .eq('product_id', productId)
    .order('created_at', { ascending: true })

  if (fileId !== undefined && !isNaN(fileId)) {
    filesQuery.eq('id', fileId)
  }

  const { data: files, error: filesError } = await filesQuery

  if (filesError || !files || files.length === 0) {
    return NextResponse.json({ error: '다운로드 파일을 찾을 수 없습니다' }, { status: 404 })
  }

  const file = files[0]

  // 6. Supabase Storage 서명 URL 생성 (file_url에서 storage path 추출)
  let downloadUrl: string = file.file_url

  // file_url이 Supabase Storage URL인 경우 서명 URL로 변환 (60초 유효)
  // 환경변수에 개행 문자가 섞여있을 수 있어 trim 필수
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const storagePublicPrefix = `${supabaseUrl}/storage/v1/object/public/`
  const storageSignedPrefix = `${supabaseUrl}/storage/v1/object/sign/`

  // 사용자가 받을 파일명 (한글 지원) — DB의 file_name 또는 상품명
  const downloadFileName = file.file_name || `${product.title}.pdf`

  if (file.file_url.startsWith(storagePublicPrefix)) {
    // public URL → storage path 추출
    const storagePath = file.file_url.replace(storagePublicPrefix, '')
    const slashIdx = storagePath.indexOf('/')
    if (slashIdx !== -1) {
      const bucket = storagePath.substring(0, slashIdx)
      const filePath = storagePath.substring(slashIdx + 1)

      // download 옵션으로 한글 파일명 지정 (Content-Disposition 헤더 설정)
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60, { download: downloadFileName })

      if (!signError && signedData?.signedUrl) {
        downloadUrl = signedData.signedUrl
      } else if (signError) {
        logger.error(`Signed URL 생성 실패: ${signError.message}`, 'download')
        return NextResponse.json({
          error: '파일을 찾을 수 없습니다. 관리자에게 문의해주세요.',
        }, { status: 404 })
      }
    }
  } else if (file.file_url.startsWith(storageSignedPrefix)) {
    // 이미 서명된 URL → 재서명
    const pathAfterSign = file.file_url.replace(storageSignedPrefix, '').split('?')[0]
    const slashIdx = pathAfterSign.indexOf('/')
    if (slashIdx !== -1) {
      const bucket = pathAfterSign.substring(0, slashIdx)
      const filePath = pathAfterSign.substring(slashIdx + 1)
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, 60, { download: downloadFileName })
      if (!signError && signedData?.signedUrl) {
        downloadUrl = signedData.signedUrl
      } else if (signError) {
        logger.error(`Signed URL 재서명 실패: ${signError.message}`, 'download')
        return NextResponse.json({
          error: '파일을 찾을 수 없습니다. 관리자에게 문의해주세요.',
        }, { status: 404 })
      }
    }
  }
  // 외부 URL(CDN 등)은 그대로 사용

  // 7. download_logs INSERT + download_count 동기화 (관리자 다운로드는 통계에 반영하지 않음)
  if (!isAdmin) {
    await supabase.from('download_logs').insert({
      user_id: user.id,
      product_id: productId,
      file_name: file.file_name || product.title,
      downloaded_at: new Date().toISOString(),
    })

    const { count: logCount } = await supabase
      .from('download_logs')
      .select('*', { count: 'exact', head: true })
      .eq('product_id', productId)

    await supabase
      .from('products')
      .update({ download_count: logCount ?? (product.download_count || 0) + 1 })
      .eq('id', productId)
  }

  // 9. 서명 URL 반환
  return NextResponse.json({ url: downloadUrl })
}
