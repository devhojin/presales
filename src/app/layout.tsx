import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageViewTracker } from "@/components/PageViewTracker";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ToastContainer } from "@/components/Toast";
import { SITE_URL } from "@/lib/constants";

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
  description: "공공조달 기술제안서, 입찰가이드, 발표자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "PRESALES - 공공조달 제안서 마켓플레이스",
    description: "공공조달 기술제안서, 입찰가이드, 발표자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
    type: "website",
    url: SITE_URL,
    siteName: "PRESALES by AMARANS Partners",
    locale: "ko_KR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PRESALES - 공공조달 제안서 마켓플레이스",
    description: "공공조달 기술제안서, 입찰가이드, 발표자료 등 전문 문서 다운로드 플랫폼.",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "PRESALES by AMARANS Partners",
  url: SITE_URL,
  description:
    "공공조달 기술제안서, 입찰가이드, 발표자료 등 전문 문서 다운로드 플랫폼. 나라장터·조달청 입찰에 최적화된 제안서 마켓플레이스.",
  sameAs: [],
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
        <GoogleAnalytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <Header />
        <PageViewTracker />
        <main className="flex-1">{children}</main>
        <Footer />
        <ToastContainer />
      </body>
    </html>
  );
}
