import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";
import { SITE_URL } from "@/lib/constants";

const BASE_URL = SITE_URL;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/us`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/announcements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/feeds`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/brief`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/consulting`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
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

    // 브리프 개별 페이지
    const { data: briefs } = await supabase
      .from("daily_briefs")
      .select("slug, sent_at, created_at")
      .eq("is_published", true)
      .order("brief_date", { ascending: false });

    const briefPages: MetadataRoute.Sitemap = (briefs ?? []).map((b) => ({
      url: `${BASE_URL}/brief/${b.slug}`,
      lastModified: b.sent_at ? new Date(b.sent_at) : new Date(b.created_at),
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    return [...staticPages, ...productPages, ...announcementPages, ...briefPages];
  } catch {
    return staticPages;
  }
}
