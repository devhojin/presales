import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
    .select("name, description, thumbnail_url")
    .eq("id", id)
    .single();

  if (!product) {
    return {
      title: "상품을 찾을 수 없습니다",
    };
  }

  const title = product.name;
  const description = product.description
    ? product.description.slice(0, 160)
    : `${product.name} - 공공조달 전문 문서 다운로드`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} | PRESALES`,
      description,
      url: `https://presales-zeta.vercel.app/store/${id}`,
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

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
