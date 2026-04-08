import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://presales-zeta.vercel.app";

export const metadata: Metadata = {
  title: "컨설팅",
  description: "공공조달 입찰 전략, 제안서 작성, 프레젠테이션 준비까지 PRESALES 전문가 컨설팅을 받아보세요.",
  alternates: {
    canonical: `${SITE_URL}/consulting`,
  },
  openGraph: {
    title: "컨설팅 | PRESALES",
    description: "공공조달 입찰 전략, 제안서 작성, 프레젠테이션 준비까지 PRESALES 전문가 컨설팅을 받아보세요.",
    url: "https://presales-zeta.vercel.app/consulting",
  },
};

export default function ConsultingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
