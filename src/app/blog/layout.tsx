import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '블로그 | 프리세일즈',
  description: '공공조달 입찰 노하우, 제안서 작성 팁, 최신 조달 트렌드를 전달합니다.',
  openGraph: {
    title: '블로그 | 프리세일즈',
    description: '공공조달 입찰 노하우, 제안서 작성 팁, 최신 조달 트렌드를 전달합니다.',
    type: 'website',
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
    </>
  )
}
