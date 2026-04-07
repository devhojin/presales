import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "PRESALES 회원가입 후 공공조달 전문 문서를 이용하세요.",
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
