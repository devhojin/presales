import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "회사소개 — PRESALES by AMARANS",
  description: "공공조달 현장 경험을 갖춘 AMARANS 팀이 운영합니다. 조달 시장의 정보 비대칭을 해소하고 실력 있는 기업의 낙찰을 돕는 것이 우리의 미션입니다.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
  openGraph: {
    title: "회사소개 — PRESALES by AMARANS",
    description: "공공조달 현장 경험을 갖춘 팀이 만드는 제안서 마켓플레이스.",
    url: `${SITE_URL}/about`,
    images: [{ url: '/images/hero-consultant-1.webp', width: 1200, height: 630, alt: '프리세일즈 회사소개' }],
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
