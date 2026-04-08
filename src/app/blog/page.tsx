import Link from 'next/link'
import { BookOpen, ArrowRight, Rss } from 'lucide-react'

const COMING_SOON_TOPICS = [
  {
    icon: '📋',
    title: '기술제안서 작성 완벽 가이드',
    desc: '나라장터 기술제안서의 구조와 핵심 작성 요령을 단계별로 안내합니다.',
    category: '제안서 작성',
  },
  {
    icon: '💰',
    title: '가격제안서 전략 A to Z',
    desc: '경쟁 낙찰을 위한 가격 산정 방법과 원가 구성 노하우를 공개합니다.',
    category: '가격 전략',
  },
  {
    icon: '🏆',
    title: '낙찰률 높이는 평가항목 분석법',
    desc: '제안 평가표를 역산해 고득점 포인트를 파악하는 방법을 소개합니다.',
    category: '입찰 전략',
  },
  {
    icon: '📊',
    title: '2026년 공공 IT 조달 트렌드',
    desc: 'AI·클라우드·디지털전환 중심의 공공 IT 사업 발주 동향을 분석합니다.',
    category: '시장 분석',
  },
  {
    icon: '📝',
    title: '발표 PT 슬라이드 구성 전략',
    desc: '심사위원의 눈을 사로잡는 발표 자료 구성과 스토리텔링 기법을 다룹니다.',
    category: '발표 PT',
  },
  {
    icon: '✅',
    title: '사전 심사 단계별 체크리스트',
    desc: '입찰 제출 전 놓치기 쉬운 서류·요건을 완벽히 점검하는 방법입니다.',
    category: '체크리스트',
  },
]

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-dark to-blue-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm mb-6">
            <Rss className="w-4 h-4" />
            <span>공공조달 인사이트 블로그</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            조달 전문가의<br />
            <span className="text-blue-300">실전 노하우</span>
          </h1>
          <p className="text-blue-100 text-lg max-w-2xl mx-auto">
            입찰 제안서 작성부터 낙찰 전략까지, 공공조달 실무에 바로 적용할 수 있는
            전문 콘텐츠를 제공합니다.
          </p>
        </div>
      </section>

      {/* Coming Soon Banner */}
      <section className="border-b border-border bg-amber-50">
        <div className="container mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              블로그 콘텐츠가 곧 제공됩니다. 최신 조달 인사이트를 가장 먼저 받아보세요.
            </p>
          </div>
          <Link
            href="/consulting"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors shrink-0"
          >
            전문가에게 직접 문의하기 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Topic Cards */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold mb-3">곧 다룰 주제들</h2>
          <p className="text-muted-foreground">실무에 직접 도움이 되는 콘텐츠를 준비하고 있습니다</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {COMING_SOON_TOPICS.map((topic, i) => (
            <div
              key={i}
              className="group relative bg-card border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 opacity-80 hover:opacity-100"
            >
              {/* Coming soon overlay tag */}
              <span className="absolute top-4 right-4 text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                준비중
              </span>
              <div className="text-3xl mb-4">{topic.icon}</div>
              <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {topic.category}
              </span>
              <h3 className="text-base font-semibold mt-3 mb-2 leading-snug">{topic.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{topic.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-muted/30 py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-3">지금 바로 전문가 도움 받기</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            블로그 콘텐츠를 기다리기 어려우시다면, 저희 전문 컨설턴트가 직접 도와드립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/store"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              제안서 템플릿 보기
            </Link>
            <Link
              href="/consulting"
              className="inline-flex items-center justify-center h-11 px-6 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors"
            >
              컨설팅 문의하기 <ArrowRight className="ml-1.5 w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
