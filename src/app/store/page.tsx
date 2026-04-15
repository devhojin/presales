import { type Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import StoreClient from './_components/StoreClient'

export const metadata: Metadata = {
  title: `문서 스토어 | ${SITE_NAME}`,
  description: '공공조달 입찰에 필요한 기술제안서, IoT, 스마트시티, AI 제안서 템플릿을 구매하고 바로 활용하세요.',
  openGraph: {
    title: `문서 스토어 | ${SITE_NAME}`,
    description: '공공조달 입찰에 필요한 모든 문서 템플릿을 한 곳에서.',
    url: `${SITE_URL}/store`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/store`,
  },
}

export default function StorePage() {
  return <StoreClient />
}
