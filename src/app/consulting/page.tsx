import { Badge } from '@/components/ui/badge'
import { Check, Clock, Video, FileText, Users, Star } from 'lucide-react'

const packages = [
  {
    name: '스팟 상담',
    price: '150,000원',
    unit: '/ 30분',
    description: '빠른 피드백이 필요할 때',
    features: [
      '화상 미팅 30분',
      '사전 공고/자료 검토',
      '핵심 피드백 요약 제공',
      '이메일 후속 Q&A 1회',
    ],
    badge: null,
    highlight: false,
  },
  {
    name: '제안서 리뷰 패키지',
    price: '500,000원',
    unit: '/ 건',
    description: '완성도 높은 제안서를 위한 전문가 리뷰',
    features: [
      '제안서 전체 리뷰 (50p 이내)',
      '평가항목별 점수 예측',
      '수정 방향 리포트 (10p)',
      '30분 화상 디브리핑',
      '1회 재리뷰 포함',
    ],
    badge: 'BEST',
    highlight: true,
  },
  {
    name: '프로젝트 컨설팅',
    price: '3,000,000원~',
    unit: '/ 프로젝트',
    description: '입찰 전 과정을 함께하는 풀 서포트',
    features: [
      '전담 컨설턴트 배정',
      '입찰공고 분석 및 전략 수립',
      '제안서 공동 작성/코칭',
      '발표 PT 리허설',
      '프로젝트 완료 후 30일 지원',
    ],
    badge: null,
    highlight: false,
  },
]

export default function ConsultingPage() {
  return (
    <div className="container mx-auto px-4 py-10">
      <div className="text-center mb-12">
        <Badge className="bg-blue-500/10 text-blue-700 border-blue-200 mb-4">
          전문가 컨설팅
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          공공조달, 혼자 하지 마세요
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          나라장터·조달청 입찰 경험이 풍부한 전문가가
          제안서 작성부터 발표까지 함께합니다.
        </p>
      </div>

      {/* Packages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            className={`relative rounded-xl border p-6 space-y-6 ${
              pkg.highlight
                ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary'
                : 'border-border'
            }`}
          >
            {pkg.badge && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                {pkg.badge}
              </Badge>
            )}
            <div>
              <h3 className="text-lg font-bold">{pkg.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
            </div>
            <div>
              <span className="text-2xl font-bold text-primary">{pkg.price}</span>
              <span className="text-sm text-muted-foreground ml-1">{pkg.unit}</span>
            </div>
            <ul className="space-y-3">
              {pkg.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              className={`w-full h-10 rounded-lg font-medium text-sm transition-colors ${
                pkg.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border hover:bg-muted'
              }`}
            >
              상담 신청하기
            </button>
          </div>
        ))}
      </div>

      {/* Process */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-center mb-8">진행 프로세스</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { icon: FileText, step: '01', title: '신청', desc: '온라인 폼 작성' },
            { icon: Clock, step: '02', title: '매칭', desc: '24시간 내 전문가 배정' },
            { icon: Video, step: '03', title: '컨설팅', desc: '화상/대면 미팅 진행' },
            { icon: Star, step: '04', title: '완료', desc: '리포트 및 후속 지원' },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground font-medium">STEP {item.step}</div>
              <h3 className="font-semibold text-sm">{item.title}</h3>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
