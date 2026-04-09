import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";
import { SITE_URL } from "@/lib/constants";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/announcements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/feeds`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/consulting`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE_URL}/blog`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return []; } } }
    );

    // 상품 페이지
    const { data: products } = await supabase
      .from("products")
      .select("id, updated_at")
      .eq("is_published", true);

    const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
      url: `${BASE_URL}/store/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    // 공개된 공고 상세 페이지
    const { data: announcements } = await supabase
      .from("announcements")
      .select("id, updated_at")
      .eq("is_published", true)
      .eq("status", "active");

    const announcementPages: MetadataRoute.Sitemap = (announcements ?? []).map((a) => ({
      url: `${BASE_URL}/announcements/${a.id}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    // 블로그 포스트
    const { data: posts } = await supabase
      .from("blog_posts")
      .select("slug, published_at")
      .eq("is_published", true);

    const blogPages: MetadataRoute.Sitemap = (posts ?? []).map((p) => ({
      url: `${BASE_URL}/blog/${p.slug}`,
      lastModified: p.published_at ? new Date(p.published_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...productPages, ...announcementPages, ...blogPages];
  } catch {
    return staticPages;
  }
}
