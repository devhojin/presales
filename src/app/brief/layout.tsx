import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '모닝 브리프 — 매일 아침 입찰 시장 인사이트',
  description: '공공조달·스마트시티·창업지원·AI/IoT 관련 시장 동향과 신규 공고를 매일 아침 정리해서 보내드립니다. 마감 임박 공고도 놓치지 마세요.',
  alternates: { canonical: `${SITE_URL}/brief` },
  openGraph: {
    title: '모닝 브리프 — 매일 아침 입찰 시장 인사이트',
    description: '공공조달·스마트시티·AI/IoT 시장 동향과 신규/마감임박 공고 요약.',
    url: `${SITE_URL}/brief`,
  },
}

export default function BriefLayout({ children }: { children: React.ReactNode }) {
  return children
}
