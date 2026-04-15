import { type Metadata } from 'next'
import { SITE_URL, SITE_NAME } from '@/lib/constants'
import AnnouncementsClient from './_components/AnnouncementsClient'

export const metadata: Metadata = {
  title: `공고 사업 | ${SITE_NAME}`,
  description: '정부 지원사업 공고 정보를 한눈에 확인하세요. 스타트업·중소기업 대상 사업 공고를 빠르게 검색하고 즐겨찾기 하세요.',
  openGraph: {
    title: `공고 사업 | ${SITE_NAME}`,
    description: '정부 지원사업 공고 정보를 한눈에 확인하세요.',
    url: `${SITE_URL}/announcements`,
    siteName: SITE_NAME,
    locale: 'ko_KR',
    type: 'website',
  },
  alternates: {
    canonical: `${SITE_URL}/announcements`,
  },
}

export default function AnnouncementsPage() {
  return <AnnouncementsClient />
}
