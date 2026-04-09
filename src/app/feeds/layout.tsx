import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'IT피드 | PRESALES',
  description: '스타트업, IT, 정책 뉴스를 매일 업데이트합니다.',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
