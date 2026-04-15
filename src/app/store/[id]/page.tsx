import { type Metadata } from 'next'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import { formatPrice } from '@/lib/types'
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
    .select('id, title, description, price, original_price, is_free, thumbnail_url, format, tags')
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
  const priceText = product.is_free ? '무료' : formatPrice(product.price)
  const description = product.description
    ? product.description.slice(0, 120)
    : `${product.title} — ${priceText} · 공공조달 제안서 템플릿`
  const pageUrl = `${SITE_URL}/store/${id}`

  return {
    title,
    description,
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
  const { id } = await params
  const product = await getProduct(id)

  // Product JSON-LD: data is from our own DB, JSON.stringify output is safe
  const productJsonLd = product
    ? JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: product.title,
        description: product.description
          ? product.description.slice(0, 300)
          : product.title,
        ...(product.thumbnail_url ? { image: product.thumbnail_url } : {}),
        offers: {
          '@type': 'Offer',
          price: product.is_free ? 0 : product.price,
          priceCurrency: 'KRW',
          availability: 'https://schema.org/InStock',
          url: `https://presales.co.kr/store/${id}`,
        },
      })
    : null

  return (
    <>
      {productJsonLd && (
        // nosec: JSON-LD content is serialized from our own DB via JSON.stringify, not user-controlled HTML
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
      )}
      <ProductDetailClient params={params} />
    </>
  )
}
