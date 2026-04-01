'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Check, X, Clock, Video, FileText, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface ConsultingPackage {
  slug: string
  name: string
  description: string
  price: string
  price_unit: string
  features: string[]
  is_best: boolean
  sort_order: number
}

// 비교표 기능 항목
const compareFeatures = [
  { label: '화상 미팅', spot: '30분', review: '30분', project: '무제한' },
  { label: '사전 공고/자료 검토', spot: true, review: true, project: true },
  { label: '핵심 피드백 요약', spot: true, review: true, project: true },
  { label: '이메일 후속 Q&A', spot: '1회', review: '포함', project: '무제한' },
  { label: '제안서 전체 리뷰 (50p 이내)', spot: false, review: true, project: true },
  { label: '평가항목별 점수 예측', spot: false, review: true, project: true },
  { label: '수정 방향 리포트 (10p)', spot: false, review: true, project: true },
  { label: '1회 재리뷰', spot: false, review: true, project: true },
  { label: '전담 컨설턴트 배정', spot: false, review: false, project: true },
  { label: '입찰공고 분석 및 전략 수립', spot: false, review: false, project: true },
  { label: '제안서 공동 작성/코칭', spot: false, review: false, project: true },
  { label: '발표 PT 리허설', spot: false, review: false, project: true },
  { label: '프로젝트 완료 후 30일 지원', spot: false, review: false, project: true },
]

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-5 h-5 text-blue-600 mx-auto" />
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" />
  return <span className="text-sm font-medium text-blue-600">{value}</span>
}

export default function ConsultingPage() {
  const [packages, setPackages] = useState<ConsultingPackage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('consulting_packages')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        if (data) setPackages(data)
        setLoading(false)
      })
  }, [])

  const spot = packages.find(p => p.slug === 'spot')
  const review = packages.find(p => p.slug === 'review')
  const project = packages.find(p => p.slug === 'project')

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

      {/* Package Cards - equal height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-20">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border p-6 space-y-6 animate-pulse">
                <div className="h-5 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-8 bg-muted rounded w-2/5" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-4 bg-muted rounded w-full" />
                  ))}
                </div>
                <div className="h-10 bg-muted rounded w-full" />
              </div>
            ))
          : packages.map((pkg) => (
              <div
                key={pkg.slug}
                className={`relative rounded-xl border p-6 flex flex-col ${
                  pkg.is_best
                    ? 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary'
                    : 'border-border'
                }`}
              >
                {pkg.is_best && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                    BEST
                  </Badge>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold">{pkg.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{pkg.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-2xl font-bold text-primary">{pkg.price}</span>
                  <span className="text-sm text-muted-foreground ml-1">{pkg.price_unit}</span>
                </div>
                <ul className="space-y-3 flex-1">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  className={`w-full h-10 rounded-lg font-medium text-sm transition-colors mt-6 ${
                    pkg.is_best
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border hover:bg-muted'
                  }`}
                >
                  상담 신청하기
                </button>
              </div>
            ))}
      </div>

      {/* Compare Table - Google AI Plans style */}
      {!loading && packages.length >= 3 && (
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-xl font-bold text-center mb-2">요금제 비교하기</h2>
          <p className="text-sm text-muted-foreground text-center mb-8">상위 패키지는 하위 패키지의 모든 기능을 포함합니다</p>

          <div className="border border-border rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 bg-muted/50">
              <div className="p-4 border-r border-border">
                <p className="text-sm font-semibold text-muted-foreground">기능</p>
              </div>
              {[spot, review, project].map((pkg) => (
                <div key={pkg?.slug || ''} className={`p-4 text-center ${pkg?.slug === 'review' ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                  {pkg?.is_best && (
                    <Badge className="bg-primary text-primary-foreground text-[10px] mb-1">BEST</Badge>
                  )}
                  <p className="font-bold text-sm">{pkg?.name || ''}</p>
                  <p className="text-primary font-bold text-lg mt-1">{pkg?.price || ''}</p>
                  <p className="text-xs text-muted-foreground">{pkg?.price_unit || ''}</p>
                </div>
              ))}
            </div>

            {/* Feature Rows */}
            {compareFeatures.map((feat, i) => (
              <div
                key={feat.label}
                className={`grid grid-cols-4 ${i % 2 === 0 ? 'bg-white' : 'bg-muted/20'} ${i < compareFeatures.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="p-3.5 border-r border-border/50 flex items-center">
                  <p className="text-sm text-gray-700">{feat.label}</p>
                </div>
                <div className={`p-3.5 flex items-center justify-center`}>
                  <FeatureCell value={feat.spot} />
                </div>
                <div className={`p-3.5 flex items-center justify-center bg-primary/[0.02] border-x border-primary/10`}>
                  <FeatureCell value={feat.review} />
                </div>
                <div className={`p-3.5 flex items-center justify-center`}>
                  <FeatureCell value={feat.project} />
                </div>
              </div>
            ))}

            {/* Bottom CTA row */}
            <div className="grid grid-cols-4 bg-muted/30 border-t border-border">
              <div className="p-4" />
              {[spot, review, project].map((pkg) => (
                <div key={pkg?.slug || ''} className={`p-4 flex items-center justify-center ${pkg?.slug === 'review' ? 'bg-primary/5 border-x border-primary/20' : ''}`}>
                  <button
                    className={`w-full h-9 rounded-lg font-medium text-xs transition-colors ${
                      pkg?.is_best
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border bg-white hover:bg-muted'
                    }`}
                  >
                    선택하기
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
