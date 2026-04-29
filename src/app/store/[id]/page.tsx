import { type Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import { normalizeProductTags } from '@/lib/product-tags'
import ProductDetailClient from './_components/ProductDetailClient'

async function getProduct(id: string) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll() {
          // 서버 컴포넌트에서는 쿠키 쓰기 불필요
        },
      },
    }
  )

  const { data } = await supabase
    .from('products')
    .select('id, title, description, thumbnail_url, format, tags')
    .eq('id', Number(id))
    .eq('is_published', true)
    .single()

  return data
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    return {
      title: `상품을 찾을 수 없습니다 | ${SITE_NAME}`,
    }
  }

  const title = `${product.title} | ${SITE_NAME}`
  const productTags = normalizeProductTags(product.tags)
  const baseDescription = product.description
    ? product.description.slice(0, 120)
    : `${product.title} — 공공조달 제안서 템플릿`
  const tagContext = productTags.length > 0
    ? ` 관련 키워드: ${productTags.slice(0, 6).join(', ')}`
    : ''
  const description = `${baseDescription}${tagContext}`.slice(0, 160)
  const pageUrl = `${SITE_URL}/store/${id}`

  return {
    title,
    description,
    ...(productTags.length > 0 ? { keywords: productTags } : {}),
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: SITE_NAME,
      locale: 'ko_KR',
      type: 'website',
      ...(product.thumbnail_url
        ? { images: [{ url: product.thumbnail_url, width: 800, height: 600, alt: product.title }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(product.thumbnail_url ? { images: [product.thumbnail_url] } : {}),
    },
    alternates: {
      canonical: pageUrl,
    },
  }
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Product JSON-LD is rendered in layout.tsx (includes AggregateRating)
  return <ProductDetailClient params={params} />
}
