import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "스토어",
  description: "공공조달 기술제안서, 입찰가이드, 구축자료 등 다양한 공공조달 전문 문서를 다운로드하세요. 나라장터·조달청 입찰 전문 문서 마켓플레이스.",
  keywords: ["공공조달 제안서", "제안서 템플릿", "나라장터 입찰 자료", "기술제안서", "무료 입찰 가이드"],
  alternates: {
    canonical: `${SITE_URL}/store`,
  },
  openGraph: {
    title: "스토어 | PRESALES",
    description: "공공조달 기술제안서, 입찰가이드, 구축자료 등 다양한 공공조달 전문 문서를 다운로드하세요.",
    url: `${SITE_URL}/store`,
  },
  twitter: {
    card: "summary_large_image",
    title: "스토어 | PRESALES",
    description: "공공조달 제안서 템플릿과 입찰 전문 문서 스토어.",
  },
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
