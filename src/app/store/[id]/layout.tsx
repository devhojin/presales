import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://presales-zeta.vercel.app";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: product } = await supabase
    .from("products")
    .select("title, description, thumbnail_url")
    .eq("id", id)
    .single();

  if (!product) {
    return {
      title: "상품을 찾을 수 없습니다",
    };
  }

  const title = product.title;
  const description = product.description
    ? product.description.slice(0, 160)
    : `${product.title} - 공공조달 전문 문서 다운로드`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PRESALES`,
      description,
      url: `${SITE_URL}/store/${id}`,
      ...(product.thumbnail_url && {
        images: [{ url: product.thumbnail_url, width: 1200, height: 630, alt: title }],
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | PRESALES`,
      description,
    },
  };
}

export default async function ProductLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  const { data: product } = await supabase
    .from("products")
    .select("title, description, thumbnail_url, price, original_price, is_free, review_avg, review_count")
    .eq("id", id)
    .single();

  const jsonLd = product
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.description || `${product.title} - 공공조달 전문 문서`,
        url: `${SITE_URL}/store/${id}`,
        ...(product.thumbnail_url && { image: product.thumbnail_url }),
        offers: {
          "@type": "Offer",
          priceCurrency: "KRW",
          price: product.is_free ? 0 : product.price,
          availability: "https://schema.org/InStock",
          url: `${SITE_URL}/store/${id}`,
        },
        ...(product.review_count > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.review_avg.toFixed(1),
            reviewCount: product.review_count,
            bestRating: 5,
            worstRating: 1,
          },
        }),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
