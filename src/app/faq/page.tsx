import type { Metadata } from 'next'
import { FaqClient } from './FaqClient'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://presales-zeta.vercel.app'

export const metadata: Metadata = {
  title: '자주 묻는 질문 (FAQ) | 프리세일즈',
  description:
    '구매/결제, 다운로드, 상품, 컨설팅, 환불 등 프리세일즈 이용에 관한 자주 묻는 질문을 확인하세요.',
  openGraph: {
    title: '자주 묻는 질문 (FAQ) | 프리세일즈',
    description: '구매/결제, 다운로드, 상품, 컨설팅, 환불 등 자주 묻는 질문',
    url: `${SITE_URL}/faq`,
  },
}

export default function FaqPage() {
  return <FaqClient />
}
