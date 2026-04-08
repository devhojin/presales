import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/mypage", "/cart", "/auth"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL || "https://presales-zeta.vercel.app"}/sitemap.xml`,
  };
}
