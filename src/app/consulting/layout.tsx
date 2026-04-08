import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "컨설팅",
  description: "공공조달 입찰 전략, 제안서 작성, 프레젠테이션 준비까지 PRESALES 전문가 컨설팅을 받아보세요.",
  alternates: {
    canonical: `${SITE_URL}/consulting`,
  },
  openGraph: {
    title: "컨설팅 | PRESALES",
    description: "공공조달 입찰 전략, 제안서 작성, 프레젠테이션 준비까지 PRESALES 전문가 컨설팅을 받아보세요.",
    url: `${SITE_URL}/consulting`,
  },
};

export default function ConsultingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
