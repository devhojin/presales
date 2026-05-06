import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '자주 묻는 질문 — PRESALES 고객지원',
  description: '결제, 다운로드, 환불, 컨설팅, AI 분석, AI 제안서 작성법, 모닝브리프 등 PRESALES 이용에 관해 자주 묻는 질문과 답변을 확인하세요.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: '자주 묻는 질문 — PRESALES 고객지원',
    description: '결제, 다운로드, 환불, 컨설팅, AI 분석, AI 제안서 작성법, 모닝브리프 등 자주 묻는 질문과 답변.',
    url: `${SITE_URL}/faq`,
  },
}

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children
}
