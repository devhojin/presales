import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '공고 사업 — 정부 지원사업 공고 | PRESALES',
  description: '정부 지원사업 공고 정보를 확인하세요. K-Startup 공고를 매일 자동 업데이트합니다. 나라장터·조달청 입찰에 필요한 공고를 한눈에.',
  alternates: { canonical: `${SITE_URL}/announcements` },
  openGraph: {
    title: '공고 사업 — 정부 지원사업 공고',
    description: '정부 지원사업 공고 정보를 확인하세요. K-Startup 공고를 매일 자동 업데이트합니다.',
    url: `${SITE_URL}/announcements`,
    siteName: 'PRESALES by AMARANS Partners',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
