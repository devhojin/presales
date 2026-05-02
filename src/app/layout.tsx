import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { MicrosoftClarity } from "@/components/MicrosoftClarity";
import { ToastContainer } from "@/components/Toast";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";
import { DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE_ALT, SITE_NAME, SITE_URL } from "@/lib/constants";
import { safeJsonLd } from "@/lib/json-ld";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "PRESALES - 공공조달 제안서 마켓플레이스",
    template: "%s | PRESALES",
  },
  description: "공공조달 기술제안서, 입찰가이드, 구축자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
  applicationName: "PRESALES",
  category: "business",
  keywords: [
    "공공조달",
    "나라장터",
    "조달청 입찰",
    "제안서 템플릿",
    "기술제안서",
    "입찰 공고",
    "공공조달 컨설팅",
  ],
  metadataBase: new URL(SITE_URL),
  verification: {
    other: {
      "naver-site-verification": "facd5b3518a10279da05d4004efd0ee6ad841570",
    },
  },
  alternates: { canonical: SITE_URL },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  openGraph: {
    title: "PRESALES - 공공조달 제안서 마켓플레이스",
    description: "공공조달 기술제안서, 입찰가이드, 구축자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
    type: "website",
    url: SITE_URL,
    siteName: "PRESALES by AMARANS",
    locale: "ko_KR",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: DEFAULT_OG_IMAGE_ALT }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PRESALES - 공공조달 제안서 마켓플레이스",
    description: "공공조달 기술제안서, 입찰가이드, 구축자료 등 전문 문서 다운로드 플랫폼.",
    images: [DEFAULT_OG_IMAGE],
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PRESALES by AMARANS",
  url: SITE_URL,
  description:
    "공공조달 기술제안서, 입찰가이드, 구축자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
  sameAs: [],
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "PRESALES",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/store?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKR.variable} h-full antialiased`}
    >
      <head>
        <link rel="alternate" type="application/rss+xml" title={`${SITE_NAME} RSS`} href={`${SITE_URL}/rss.xml`} />
        <GoogleAnalytics />
        <MicrosoftClarity />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <PageViewTracker />
        <main className="flex-1">{children}</main>
        <Footer />
        <ToastContainer />
        <ChatWidget />
        <ExitIntentPopup />
      </body>
    </html>
  );
}
