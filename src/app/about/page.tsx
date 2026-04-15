'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase'

interface TeamMember {
  name: string
  role: string
  image_url: string
  career: string[]
  expertise: string[]
  sort_order: number
}

interface TimelineItem {
  year: string
  event: string
}

// 이니셜 매핑
function getInitials(name: string): string {
  const map: Record<string, string> = {
    'Roy. Chae': 'RC',
    'Tenderly': 'TL',
    'Hooni': 'HN',
    'Yoouni': 'YN',
    '시온': 'SI',
    'BB': 'BB',
  }
  return map[name] || name.slice(0, 2).toUpperCase()
}

// 소개 문구 매핑
function getIntro(name: string): string {
  const map: Record<string, string> = {
    'Roy. Chae': '공공입찰 제안 전략과 사전제안(Pre-sales) 기획을 총괄합니다. ITS·스마트시티·AI 기반 신사업 기획부터 제안서 발표까지, 수주 전 과정을 리딩합니다.',
    'Tenderly': 'AI 모델링·데이터 분석·예측 시스템 설계를 담당합니다. AI CCTV 관제, 블랙아이스 감지, 헬스케어 AI 서비스 등 기술 기반 사업의 실현 가능성과 데이터 논리를 보강합니다.',
    'Hooni': '스마트팩토리·건설현장·전력관제 등 현장 중심 시스템 구축 PM을 담당합니다. 포스코·현대제철·대우건설 등 대형 프로젝트 실행 경험을 바탕으로 실행 가능한 제안 구조를 설계합니다.',
    'Yoouni': '관제 시스템 MMI, 서비스 정책서, 제안서 비주얼 설계를 담당합니다. 복잡한 기술 내용을 평가자와 사용자가 직관적으로 이해할 수 있는 화면과 문서로 변환합니다.',
    '시온': '금융·통신·IoT 플랫폼 서비스 기획 경험을 보유합니다. 카카오뱅크·하나생명·NS홈쇼핑 등 대형 SI 서비스기획부터 구독BM 플랫폼 설계까지, 시스템과 사용자 사이의 언어를 정밀하게 연결합니다.',
    'BB': '글로벌 기업에서 온·오프라인 마케팅 전략을 실행한 경험을 보유합니다. 연평균 6회 이상 국내 대형 전시회를 기획·운영하며, 브랜드 인지도 확대와 리드 확보를 동시에 설계합니다.',
  }
  return map[name] || ''
}

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [mission, setMission] = useState('')
  const [vision, setVision] = useState('')
  const [value, setValue] = useState('')
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    Promise.all([
      supabase.from('team_members').select('*').eq('is_published', true).order('sort_order'),
      supabase.from('site_settings').select('key, value').in('key', [
        'mission',
        'vision',
        'value_statement',
        'timeline_2023',
        'timeline_2024',
        'timeline_2025',
        'timeline_2026',
      ]),
    ]).then(([teamRes, settingsRes]) => {
      if (teamRes.data) setTeam(teamRes.data)

      if (settingsRes.data) {
        const s = Object.fromEntries(
          settingsRes.data.map((r: { key: string; value: string }) => [r.key, r.value])
        )
        setMission(s.mission ?? '')
        setVision(s.vision ?? '')
        setValue(s.value_statement ?? '')

        const tl: TimelineItem[] = []
        if (s.timeline_2023) tl.push({ year: '2023', event: s.timeline_2023 })
        if (s.timeline_2024) tl.push({ year: '2024', event: s.timeline_2024 })
        if (s.timeline_2025) tl.push({ year: '2025', event: s.timeline_2025 })
        if (s.timeline_2026) tl.push({ year: '2026', event: s.timeline_2026 })
        setTimeline(tl)
      }

      setLoading(false)
    })
  }, [])

  return (
    <div className="bg-background">
      {/* Header */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="py-8 md:py-12">
          <div className="flex items-center gap-3 mb-3">
            <Building2 className="w-7 h-7 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">회사소개</h1>
          </div>
          <p className="text-muted-foreground">공공조달의 복잡함을 문서로 단순하게 — 나라장터·조달청 입찰 전문 플랫폼</p>
        </div>
      </div>

      {/* Mission / Vision / Values */}
      {(loading || mission || vision || value) && (
        <div className="bg-muted/30">
          <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {loading
                ? Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="border border-border/50 bg-card rounded-2xl p-8 space-y-3 animate-pulse">
                      <div className="h-5 bg-muted rounded w-1/3" />
                      <div className="h-4 bg-muted rounded w-full" />
                      <div className="h-4 bg-muted rounded w-4/5" />
                    </div>
                  ))
                : [
                    { title: 'Mission', desc: mission },
                    { title: 'Vision', desc: vision },
                    { title: 'Value', desc: value },
                  ]
                    .filter((item) => item.desc)
                    .map((item) => (
                      <div key={item.title} className="border border-border/50 bg-card rounded-2xl p-8 space-y-4 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-shadow duration-500">
                        <h3 className="text-lg font-bold text-primary">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
            </div>
          </div>
        </div>
      )}

      {/* Track Record (실적) */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">TRACK RECORD</p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-3">수주 실적</h2>
          <p className="text-muted-foreground">
            소프트웨어 기술자 경력 특급 · 정보통신기술 기능계기술자
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: '🏛',
              title: '공공조달 · SI 제안',
              color: 'from-blue-500 to-blue-700',
              items: [
                '수도권 광역시 지능형교통시스템(ITS) 유지관리 용역',
                '경기도 스마트빌리지 보급 및 확산사업 (AI 기반 서비스)',
                '경기도 생활밀착형 도시재생 스마트기술 지원사업',
                '충남 지능형교통체계(ITS) 구축사업',
                '종합상황센터 시스템 개선 사업',
                '스마트관제 시스템 제작 구매 설치 사업',
                '경기도 스마트 경로당 구축 사업',
                '다차로 하이패스 차량검지 매칭 시스템 개발',
              ],
            },
            {
              icon: '🏭',
              title: '스마트팩토리 · IoT',
              color: 'from-blue-500 to-blue-600',
              items: [
                '반도체 기업 스마트공장 구축 및 고도화 사업 (PM)',
                '반도체 기업 종합관제시스템 구축사업 (PM)',
                '2차전지 대기업 전력검침 자동화 시스템 (PM)',
                'IoT 환경설비 모니터링 플랫폼 론칭 (350여 중소기업 활용)',
                '철강 대기업 집진기 화재위험 안전 시스템',
                '철강 대기업 GAS 감시 및 밀폐공간 안전 플랫폼',
                '건설 대기업 스마트 컨스트럭션 안전 플랫폼',
              ],
            },
            {
              icon: '🚗',
              title: 'AI · 교통관제',
              color: 'from-violet-500 to-violet-600',
              items: [
                'AI 기반 도로결빙 관제 시스템 (혁신제품 등록, 실증 완료)',
                'AI 교차로 신호등 관련 신사업 기획',
                '정부기관 디지털 안전 선도모델 개발 (재난안전)',
                '광역시 자율주행 리빙랩 사업계획 (700억 규모)',
                '라이다 기반 회전교차로 상품 기획',
              ],
            },
            {
              icon: '💼',
              title: '금융 · 기업 SI',
              color: 'from-pink-500 to-pink-600',
              items: [
                '인터넷전문은행 기업뱅킹 신규구축 (수주)',
                '생명보험사 온라인 채널 구축 컨설팅',
                '은행 오픈뱅킹 사업',
                '저축은행 웹접근성 사업',
                '생명보험사 다이렉트 보험 기획',
                '카드사 웹접근성 사업',
              ],
            },
          ].map((category) => (
            <div
              key={category.title}
              className="border border-border/50 bg-card rounded-2xl p-7 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-500 hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center text-lg`}>
                  {category.icon}
                </div>
                <h3 className="font-bold text-sm text-foreground">{category.title}</h3>
              </div>
              <ul className="space-y-2.5">
                {category.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <span className="text-primary mt-0.5 shrink-0">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
