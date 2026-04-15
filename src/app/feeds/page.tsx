import { type Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import FeedsClient from './_components/FeedsClient'

export const metadata: Metadata = {
  title: `IT피드 | ${SITE_NAME}`,
  description: '스타트업, IT, 정책 뉴스를 매일 업데이트합니다. 공공조달과 정부 지원사업 관련 최신 소식을 한 곳에서 확인하세요.',
  openGraph: {
    title: `IT피드 | ${SITE_NAME}`,
    description: '스타트업, IT, 정책 뉴스를 매일 업데이트합니다.',
    url: `${SITE_URL}/feeds`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/feeds`,
  },
}

export default function FeedsPage() {
  return <FeedsClient />
}
