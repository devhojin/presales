import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "컨설팅 — 입찰 전문가와 함께하는 제안서 코칭",
  description: "스팟 컨설팅, 제안서 리뷰, 프로젝트 동행까지. 공공조달 입찰 전문가가 제안서 전략 수립부터 발표 준비까지 1:1로 코칭합니다.",
  alternates: {
    canonical: `${SITE_URL}/consulting`,
  },
  openGraph: {
    title: "컨설팅 — 입찰 전문가와 함께하는 제안서 코칭",
    description: "스팟 컨설팅, 제안서 리뷰, 프로젝트 동행까지. 입찰 전문가의 1:1 코칭.",
    url: `${SITE_URL}/consulting`,
  },
};

export default function ConsultingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
