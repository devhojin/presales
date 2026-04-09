import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'IT피드 — 스타트업·IT·정책 뉴스 | PRESALES',
  description: '전자신문, AI타임스, 테크엠 등 IT/스타트업 뉴스와 정부 정책소식을 매일 업데이트합니다.',
  alternates: { canonical: `${SITE_URL}/feeds` },
  openGraph: {
    title: 'IT피드 — 스타트업·IT·정책 뉴스',
    description: '전자신문, AI타임스, 테크엠 등 IT/스타트업 뉴스와 정부 정책소식을 매일 업데이트합니다.',
    url: `${SITE_URL}/feeds`,
    siteName: 'PRESALES by AMARANS Partners',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
