import type { Metadata } from "next";
import { CONSULTING_PACKAGES, SITE_URL } from "@/lib/constants";
import { safeJsonLd } from "@/lib/json-ld";

export const metadata: Metadata = {
  title: "컨설팅 — 공공조달 제안서 리뷰와 입찰 전략 코칭",
  description: "스팟 상담, 제안서 리뷰, 프로젝트 동행까지. 공공조달 제안서 구조, 평가표 대응, 발표 준비를 전문가와 함께 점검합니다.",
  keywords: ["공공조달 컨설팅", "입찰 제안서 리뷰", "나라장터 제안서 코칭", "제안서 발표 리허설", "PRESALES 컨설팅"],
  alternates: {
    canonical: `${SITE_URL}/consulting`,
  },
  openGraph: {
    title: "컨설팅 — 공공조달 제안서 리뷰와 입찰 전략 코칭",
    description: "제안서 구조, 평가표 대응, 발표 준비를 전문가와 함께 점검합니다.",
    url: `${SITE_URL}/consulting`,
    images: [{ url: '/images/hero-consulting-panel.webp', width: 1200, height: 630, alt: '프리세일즈 컨설팅' }],
  },
  twitter: {
    card: "summary_large_image",
    title: "컨설팅 — PRESALES",
    description: "공공조달 제안서 리뷰와 입찰 전략 코칭.",
    images: ['/images/hero-consulting-panel.webp'],
  },
};

const consultingServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "PRESALES 공공조달 제안서 컨설팅",
  url: `${SITE_URL}/consulting`,
  areaServed: "KR",
  description: metadata.description,
  provider: {
    "@type": "Organization",
    name: "PRESALES by AMARANS",
    url: SITE_URL,
  },
  makesOffer: Object.values(CONSULTING_PACKAGES).map((pkg) => ({
    "@type": "Offer",
    name: pkg.name,
    price: pkg.priceWon,
    priceCurrency: "KRW",
    availability: "https://schema.org/InStock",
    url: `${SITE_URL}/consulting`,
  })),
};

export default function ConsultingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(consultingServiceJsonLd) }}
      />
      {children}
    </>
  );
}
