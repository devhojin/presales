import type { Metadata } from "next";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "회사소개",
  description: "PRESALES by AMARANS Partners. 공공조달 제안서 마켓플레이스를 운영하는 전문 기업을 소개합니다.",
  openGraph: {
    title: "회사소개 | PRESALES",
    description: "PRESALES by AMARANS Partners. 공공조달 제안서 마켓플레이스를 운영하는 전문 기업을 소개합니다.",
    url: `${SITE_URL}/about`,
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
