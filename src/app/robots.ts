import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

const NAVER_SITE_URL = "https://www.presales.co.kr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/auth/callback"],
      },
    ],
    sitemap: [`${SITE_URL}/sitemap.xml`, `${NAVER_SITE_URL}/naver-sitemap.xml`],
  };
}
