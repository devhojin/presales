import type { NextConfig } from "next";

// Content Security Policy
// - Next.js 인라인 스크립트/스타일 때문에 'unsafe-inline' 허용 (Next가 공식적으로 요구)
// - 결제 위젯(Toss/PortOne), Google Analytics, Supabase, YouTube 임베드 허용
const cspDirectives = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.tosspayments.com https://cdn.portone.io https://www.googletagmanager.com https://www.google-analytics.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://vswkrbemigyclgjrpgqt.supabase.co https://*.supabase.co https://www.google-analytics.com https://img.youtube.com https://i.ytimg.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://vswkrbemigyclgjrpgqt.supabase.co https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.google-analytics.com https://api.tosspayments.com https://*.portone.io",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://js.tosspayments.com https://*.portone.io",
  "media-src 'self' blob: https://vswkrbemigyclgjrpgqt.supabase.co",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.tosspayments.com")' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Content-Security-Policy', value: cspDirectives },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'vswkrbemigyclgjrpgqt.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
