import type { Metadata } from 'next'
import { AiAnalysisClient } from './ai-analysis-client'

export const metadata: Metadata = {
  title: 'AI RFP 분석',
  description: 'RFP 제안요청서 PDF를 업로드하면 원문 근거 기반 AI 분석 HTML 리포트를 생성합니다.',
  robots: {
    index: false,
    follow: false,
  },
}

export default function AiAnalysisPage() {
  return <AiAnalysisClient />
}
