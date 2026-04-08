import Link from 'next/link'
import { BookOpen, ArrowRight, Rss, Calendar, User } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'

const BLOG_POSTS = [
  {
    id: 1,
    title: '기술제안서 작성, 이것만 알면 됩니다',
    excerpt: '나라장터 기술제안서의 핵심 구성요소 5가지를 완벽히 해설합니다.',
    category: '제안서 작성',
    author: '조달 전문가',
    date: '2026-04-08',
    content: `
## 기술제안서의 5가지 핵심 구성요소

공공 조달 기술제안서는 단순한 문서가 아닙니다. 심사위원의 평가 기준에 정확히 부합하는 문서 작성이 낙찰의 핵심입니다.

### 1. 사업 이해도 및 전략 (25~30점)
- 발주자의 요구사항을 얼마나 정확히 이해했는지 보여주세요
- 기술 제안의 차별성과 혁신성 강조
- 비용 효율성과 위험 회피 전략 제시

### 2. 기술 구현 방안 (35~40점)
- 구체적인 기술 체계 설명
- 일정, 인력, 장비 등 자원 계획
- 품질 보증 계획
- 기술 검증 방법론

### 3. 사업 관리 역량 (15~20점)
- 관리 조직 구성
- 리스크 관리 계획
- 변경 관리 프로세스
- 이해관계자 관리

### 4. 유사 사업 경험 (10~15점)
- 관련 프로젝트 사례
- 참여 인력의 경험
- 성과와 교훈

### 5. 비용 제안서 연계 (5~10점)
- 기술 구현과 비용의 연결성
- 선택 항목별 비용 명시
- 부가 서비스 제시

## 작성 팁

1. **평가표 역산 작성**: 먼저 발주청의 평가표를 분석하고 역순으로 제안서 구성
2. **구체성 중시**: 추상적 표현 대신 측정 가능한 지표 제시
3. **시각화 활용**: 다이어그램, 차트로 복잡한 내용 단순화
4. **일관성 유지**: 기술제안서와 비용제안서의 내용 일치

매력적인 기술제안서는 낙찰의 가장 강력한 무기입니다.
    `,
  },
  {
    id: 2,
    title: '나라장터 입찰 초보 가이드',
    excerpt: '조달청 나라장터 입찰 절차를 단계별로 완벽히 안내합니다.',
    category: '입찰 절차',
    author: '조달 전문가',
    date: '2026-04-07',
    content: `
## 나라장터 입찰 완벽 가이드

나라장터(www.g2b.go.kr)는 공공조달의 중심입니다. 올바른 절차를 따르면 성공 확률을 높일 수 있습니다.

### 1단계: 입찰 사전 준비

#### 1-1. 기업 정보 등록 및 인증
- 조달청 회원가입 (전자인증서 필수)
- 기업 정보 및 자격 등록
- 원도급업체/하도급업체 분류
- 신용도 조회 (신용평가등급, 기술용역비 적격성)

#### 1-2. 사업 분석
- 공고 검색 및 분석
- 사업 규모 및 일정 확인
- 자사 적격성 검토
- 경쟁사 현황 파악

### 2단계: 입찰 참여 신청

#### 2-1. 적격심사
- 발주청 요청 자료 준비
- 기술 자격 요건 충족 확인
- 재무 상태 검증
- 법정 필수 인증 (ISO, 보안인증 등)

#### 2-2. 입찰 신청
- 나라장터에서 입찰 신청
- 전자인증서 서명
- 담당자 연락처 정확히 기입
- 신청 마감일 이전 완료

### 3단계: 제안서 작성

#### 3-1. 기술제안서 작성
- 발주청 요구사항 분석
- 기술 방안 수립
- 구현 일정 및 계획 수립
- 품질보증 계획 수립

#### 3-2. 비용제안서 작성
- 원가 분석 (급여, 재료비, 경비, 이윤)
- 가격 전략 수립
- 부가 서비스 검토
- 낙찰가 예상

### 4단계: 입찰 제출

#### 4-1. 서류 최종 점검
- 필수 제출 서류 확인
- 법적 합격 요건 재확인
- 정보 오류 여부 확인

#### 4-2. 온라인 제출
- 파일 업로드
- 인증서 서명
- 마감시간 5분 전 완료 (여유있게)
- 제출 확인

### 5단계: 평가 및 낙찰

- 적격심사 (통과/불합격)
- 기술점수 + 가격점수 평가
- 낙찰자 결정 (공고)
- 계약 체결

## 주의사항

- **서명 전 3회 확인**: 오타나 오류는 낙찰 취소의 원인
- **마감일 관리**: 반드시 2시간 전 시스템 접속 시도
- **파일 형식**: 발주청 요구 형식 정확히 준수
- **금액 오기**: 비용제안서의 합계 오류는 매우 심각

성공적인 나라장터 입찰은 철저한 준비에서 시작됩니다.
    `,
  },
  {
    id: 3,
    title: '낙찰률을 높이는 가격제안서 전략',
    excerpt: '경쟁력 있는 가격 제시로 낙찰률을 높이는 실전 전략을 공개합니다.',
    category: '가격 전략',
    author: '조달 전문가',
    date: '2026-04-06',
    content: `
## 가격제안서 전략 A to Z

공공조달에서 가격은 중요한 평가 항목입니다. 현실적인 비용 분석과 전략적 가격 설정이 낙찰의 열쇠입니다.

### 1단계: 정확한 원가 파악

#### 1-1. 직접비 계산
**급여비**
- 프로젝트 관리자: 월급 × 개월수
- 기술 인력: 기술 분야별 × 투입 개월수
- 인건비 상한: 국가기술자격법 기준 적용

**재료비 및 외주비**
- 구매처별 견적 수집
- 수량 산정의 정확성
- 부가세 제외 (세전 가격)

**장비비**
- 구매 vs 임차 검토
- 감가상각비 계산
- 보험료 포함

#### 1-2. 간접비 및 이윤
- 일반관리비: 직접비의 10~20%
- 기술료: 기술 난이도별 5~15%
- 부가세: 세금 별도 계산

### 2단계: 경쟁 분석

#### 2-1. 발주청 예정가격 분석
- 공고된 예정가격 검토 (공개 경우)
- 과거 낙찰가 조사
- 유사 프로젝트 가격 비교

#### 2-2. 경쟁사 분석
- 경쟁사 입찰 경향
- 시장 평균 가격대
- 선제 이윤 조정 전략

### 3단계: 가격 전략 수립

#### 3-1. 적정 가격대 결정
**보수적 전략**
- 기술점수가 높을 경우
- 기술점수 × 40% + 가격점수 × 60% 상황
- 예정가격의 90~95% 범위

**공격적 전략**
- 원가 우위가 있을 경우
- 시장 점유율 확대 필요시
- 예정가격의 75~85% 범위

#### 3-2. 가격 배분 전략
- 선택 항목 비용 별도 기재
- 유지보수 비용 투명성
- 부가 서비스 비용 명시

### 4단계: 제안서 작성

#### 4-1. 가격 명세서 작성
- 항목별 수량 명확히 기재
- 단가의 합리성 입증
- 금액 합계 정확히 계산
- 비고란에 설명 추가 (예: PM 1명, 4인 투입)

#### 4-2. 원가 계산서
- 상세 내역서
- 합리성 입증
- 참고 자료 첨부

### 5단계: 낙찰 후 대응

#### 5-1. 적정성 심사 대비
- 원가 계산 자료 완벽 준비
- 급여 기준 증명 서류
- 외주비 견적서

#### 5-2. 계약금 협상
- 기술료 선행 지급 요청
- 선금 비율 조정
- 분할 납부 협의

## 주의사항

- **덤핑가격**: 적정 이윤 없이 저가 입찰은 낙찰 후 문제 발생 가능
- **예정가격 예측**: 지나친 낮춤은 의혹 초래
- **비용 증명**: 모든 항목에 근거 자료 첨부
- **기술과 가격의 조화**: 과도한 저가는 기술점수 감점 가능

전략적 가격 책정으로 낙찰 확률을 높이세요.
    `,
  },
]

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

      {/* Blog Posts */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold mb-2">최신 조달 인사이트</h2>
          <p className="text-muted-foreground mb-8">공공조달 실무에 바로 적용할 수 있는 전문 콘텐츠</p>

          <Accordion className="space-y-4">
            {BLOG_POSTS.map((post) => (
              <AccordionItem key={post.id} className="border border-border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-6 py-4 hover:bg-muted/50 transition-colors">
                  <div className="flex-1 text-left">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-left mb-2">{post.title}</h3>
                        <p className="text-sm text-muted-foreground mb-3 text-left">{post.excerpt}</p>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                              {post.category}
                            </span>
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(post.date).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-6 py-4 bg-muted/30 border-t border-border">
                  <div className="prose prose-sm max-w-none text-sm text-muted-foreground space-y-4">
                    {post.content.split('\n').map((line, i) => {
                      const trimmed = line.trim()
                      if (trimmed === '') return null
                      if (trimmed.startsWith('## ')) {
                        return (
                          <h2 key={i} className="text-base font-semibold text-foreground mt-6 mb-3">
                            {trimmed.replace('## ', '')}
                          </h2>
                        )
                      }
                      if (trimmed.startsWith('### ')) {
                        return (
                          <h3 key={i} className="text-sm font-semibold text-foreground mt-4 mb-2">
                            {trimmed.replace('### ', '')}
                          </h3>
                        )
                      }
                      if (trimmed.startsWith('- ')) {
                        return (
                          <div key={i} className="flex gap-2 ml-4">
                            <span className="text-primary">•</span>
                            <span>{trimmed.replace('- ', '')}</span>
                          </div>
                        )
                      }
                      if (trimmed === '```' || trimmed.startsWith('```')) {
                        return null
                      }
                      if (trimmed === '-----') {
                        return null
                      }
                      if (trimmed.includes('|')) {
                        return null
                      }
                      if (trimmed) {
                        return (
                          <p key={i} className="leading-relaxed">
                            {trimmed}
                          </p>
                        )
                      }
                      return null
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Coming Soon Topics */}
      <section className="border-t border-border bg-muted/20 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-2xl font-bold mb-3">곧 다룰 주제들</h2>
            <p className="text-muted-foreground">추가 콘텐츠를 준비하고 있습니다</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {COMING_SOON_TOPICS.map((topic, i) => (
              <div
                key={i}
                className="group relative bg-card border border-border rounded-xl p-6 hover:shadow-md hover:-translate-y-1 transition-all duration-200 opacity-75"
              >
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
