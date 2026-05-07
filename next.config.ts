import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://js.tosspayments.com",
  "https://static.danalpay.com",
  "https://cdn.portone.io",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://www.clarity.ms",
  "https://scripts.clarity.ms",
  "https://t1.kakaocdn.net",
].join(" ");

const connectSrc = [
  "'self'",
  "https://vswkrbemigyclgjrpgqt.supabase.co",
  "https://*.supabase.co",
  "wss://*.supabase.co",
  "https://www.google-analytics.com",
  "https://*.google-analytics.com",
  "https://www.clarity.ms",
  "https://*.clarity.ms",
  "https://c.bing.com",
  "https://api.tosspayments.com",
  "https://one-api.danalpay.com",
  "https://*.danalpay.com",
  "https://*.portone.io",
  "https://*.kakao.com",
  ...(isDev
    ? [
        "ws://localhost:*",
        "ws://127.0.0.1:*",
        "http://localhost:*",
        "http://127.0.0.1:*",
      ]
    : []),
].join(" ");

const cspDirectives = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://vswkrbemigyclgjrpgqt.supabase.co https://*.supabase.co https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms https://*.clarity.ms https://c.bing.com https://img.youtube.com https://i.ytimg.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  `connect-src ${connectSrc}`,
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.tosspayments.com https://static.danalpay.com https://*.danalpay.com https://*.portone.io https://*.kakao.com",
  "media-src 'self' blob: https://vswkrbemigyclgjrpgqt.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://*.danalpay.com https://*.kakao.com",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.tosspayments.com" "https://static.danalpay.com" "https://*.danalpay.com")',
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Content-Security-Policy", value: cspDirectives },
];

const noIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@napi-rs/canvas"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "vswkrbemigyclgjrpgqt.supabase.co",
        pathname: "/storage/v1/object/**",
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      { source: "/admin/:path*", headers: noIndexHeaders },
      { source: "/mypage/:path*", headers: noIndexHeaders },
      { source: "/cart/:path*", headers: noIndexHeaders },
      { source: "/checkout/:path*", headers: noIndexHeaders },
      { source: "/auth/:path*", headers: noIndexHeaders },
      { source: "/api/:path*", headers: noIndexHeaders },
    ];
  },
  async redirects() {
    return [
      { source: "/gov", destination: "/announcements", permanent: true },
      { source: "/gov/:path*", destination: "/announcements", permanent: true },
      { source: "/notice", destination: "/feeds", permanent: true },
      { source: "/notice/:path*", destination: "/feeds", permanent: true },
      { source: "/23", destination: "/feeds", permanent: true },
      { source: "/23/:path*", destination: "/feeds", permanent: true },
      {
        source: "/ai-proposal-guide/chatgpt-rfp-analysis",
        destination: "/ai-proposal-guide/ai-rfp-analysis",
        permanent: true,
      },
      {
        source: "/ai-proposal-guide/codex-document-operations",
        destination: "/ai-proposal-guide/ai-document-operations",
        permanent: true,
      },
      { source: "/:legacyId(\\d+)", destination: "/store", permanent: true },
      { source: "/:legacyId(\\d+)/:path*", destination: "/store", permanent: true },
    ];
  },
};

export default nextConfig;
