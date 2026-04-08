import type { Metadata } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://presales-zeta.vercel.app";

export const metadata: Metadata = {
  title: "장바구니",
  description: "선택한 공공조달 문서를 확인하고 구매하세요.",
  alternates: {
    canonical: `${SITE_URL}/cart`,
  },
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
