import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/constants'
import { safeJsonLd } from '@/lib/json-ld'

export const metadata: Metadata = {
  title: '우리는 — 공공조달 제안서 마켓플레이스의 기준',
  description: '프리세일즈는 공공조달 제안서 템플릿, 입찰 정보, IT피드, 모닝 브리프, 전문가 컨설팅을 연결해 제안 준비의 정보 격차를 줄입니다.',
  keywords: ['공공조달 제안서', '나라장터 제안서', '입찰 제안서 템플릿', '조달청 입찰', '프리세일즈'],
  alternates: { canonical: `${SITE_URL}/us` },
  openGraph: {
    title: '우리는 — 공공조달 제안서 마켓플레이스의 기준',
    description: '제안서 템플릿, 입찰 정보, IT피드, 전문가 컨설팅을 연결하는 PRESALES.',
    url: `${SITE_URL}/us`,
  },
  twitter: {
    card: 'summary_large_image',
    title: '우리는 — PRESALES',
    description: '공공조달 제안 준비의 정보 격차를 줄이는 제안서 마켓플레이스.',
  },
}

const aboutPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: '우리는 — PRESALES',
  url: `${SITE_URL}/us`,
  description: metadata.description,
  isPartOf: {
    '@type': 'WebSite',
    name: 'PRESALES',
    url: SITE_URL,
  },
}

export default function UsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(aboutPageJsonLd) }}
      />
      {children}
    </>
  )
}
