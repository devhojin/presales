import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '공고 사업 | PRESALES',
  description: '정부 지원사업 공고 정보를 확인하세요. 나라장터·K-Startup 공고를 매일 업데이트합니다.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
