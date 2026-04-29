import type { MetadataRoute } from "next";
import { createServerClient } from "@supabase/ssr";
import { SITE_URL } from "@/lib/constants";
import { morningBriefSlug } from "@/lib/public-briefs";
import { morningBriefService } from "../../morning-brief/lib/supabase";

const BASE_URL = SITE_URL;
const SITEMAP_BATCH_SIZE = 1000;

type SitemapAnnouncement = {
  id: string;
  updated_at: string | null;
  status: string | null;
};

type SitemapFeed = {
  id: string;
  updated_at: string | null;
  created_at: string | null;
};

type SitemapMorningBrief = {
  brief_date: string;
  started_at: string | null;
  finished_at: string | null;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/us`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE_URL}/store`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/announcements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/feeds`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/brief`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/consulting`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/faq`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${BASE_URL}/refund`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      supabaseKey,
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

    // 공개된 공고 상세 페이지: 마감 공고도 검색 진입점이 될 수 있으므로 sitemap에 포함
    const announcements: SitemapAnnouncement[] = [];
    for (let from = 0; ; from += SITEMAP_BATCH_SIZE) {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, updated_at, status")
        .eq("is_published", true)
        .order("updated_at", { ascending: false })
        .range(from, from + SITEMAP_BATCH_SIZE - 1);

      if (error) throw error;
      announcements.push(...(data ?? []));
      if (!data || data.length < SITEMAP_BATCH_SIZE) break;
    }

    const announcementPages: MetadataRoute.Sitemap = (announcements ?? []).map((a) => ({
      url: `${BASE_URL}/announcements/${a.id}`,
      lastModified: a.updated_at ? new Date(a.updated_at) : new Date(),
      changeFrequency: a.status === "active" ? "daily" as const : "weekly" as const,
      priority: a.status === "active" ? 0.7 : 0.45,
    }));

    // 공개된 IT피드 상세 페이지
    const feeds: SitemapFeed[] = [];
    for (let from = 0; ; from += SITEMAP_BATCH_SIZE) {
      const { data, error } = await supabase
        .from("community_posts")
        .select("id, updated_at, created_at")
        .eq("is_published", true)
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .range(from, from + SITEMAP_BATCH_SIZE - 1);

      if (error) throw error;
      feeds.push(...(data ?? []));
      if (!data || data.length < SITEMAP_BATCH_SIZE) break;
    }

    const feedPages: MetadataRoute.Sitemap = feeds.map((feed) => ({
      url: `${BASE_URL}/feeds/${feed.id}`,
      lastModified: feed.updated_at ? new Date(feed.updated_at) : feed.created_at ? new Date(feed.created_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.55,
    }));

    // 브리프 개별 페이지: 메일 발송과 같은 morning-brief 마스터 DB를 기준으로 노출
    let briefPages: MetadataRoute.Sitemap = [];
    try {
      const mb = morningBriefService();
      const { data: briefs, error: briefError } = await mb
        .from("briefs")
        .select("brief_date, started_at, finished_at")
        .eq("status", "sent")
        .not("html_body", "is", null)
        .order("brief_date", { ascending: false });

      if (briefError) throw briefError;

      briefPages = ((briefs ?? []) as SitemapMorningBrief[]).map((b) => ({
        url: `${BASE_URL}/brief/${morningBriefSlug(b.brief_date)}`,
        lastModified: b.finished_at ? new Date(b.finished_at) : b.started_at ? new Date(b.started_at) : new Date(b.brief_date),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    } catch {
      briefPages = [];
    }

    return [...staticPages, ...productPages, ...announcementPages, ...feedPages, ...briefPages];
  } catch {
    return staticPages;
  }
}
