import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '모닝 브리프 | PRESALES',
  description: '공공조달·스마트시티·창업지원·AI/IoT 관련 시장 동향과 신규 공고를 매일 아침 정리해서 보내드립니다.',
  openGraph: {
    title: '모닝 브리프 — 매일 아침 시장 동향',
    description: '공공조달·스마트시티·창업지원·AI/IoT 관련 시장 동향과 신규/마감임박 공고 요약',
    type: 'website',
  },
}

export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return children
}
