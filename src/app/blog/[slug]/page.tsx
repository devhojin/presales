'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import DOMPurify from 'dompurify'

// 임시 블로그 포스트 데이터 (전체)
const BLOG_POSTS = [
  {
    id: 1,
    title: '기술제안서 작성, 이것만 알면 됩니다',
    slug: 'technical-proposal-guide',
    excerpt: '나라장터 기술제안서의 핵심 구성요소 5가지를 완벽히 해설합니다.',
    category: '제안서 작성',
    author: '조달 전문가',
    published_at: '2026-04-08',
    tags: ['기술제안서', '제안서', '나라장터'],
    view_count: 234,
    content_html: `
<h2>기술제안서의 5가지 핵심 구성요소</h2>
<p>공공 조달 기술제안서는 단순한 문서가 아닙니다. 심사위원의 평가 기준에 정확히 부합하는 문서 작성이 낙찰의 핵심입니다.</p>

<h3>1. 사업 이해도 및 전략 (25~30점)</h3>
<ul>
  <li>발주자의 요구사항을 얼마나 정확히 이해했는지 보여주세요</li>
  <li>기술 제안의 차별성과 혁신성 강조</li>
  <li>비용 효율성과 위험 회피 전략 제시</li>
</ul>

<h3>2. 기술 구현 방안 (35~40점)</h3>
<ul>
  <li>구체적인 기술 체계 설명</li>
  <li>일정, 인력, 장비 등 자원 계획</li>
  <li>품질 보증 계획</li>
  <li>기술 검증 방법론</li>
</ul>

<h3>3. 사업 관리 역량 (15~20점)</h3>
<ul>
  <li>관리 조직 구성</li>
  <li>리스크 관리 계획</li>
  <li>변경 관리 프로세스</li>
  <li>이해관계자 관리</li>
</ul>

<h3>4. 유사 사업 경험 (10~15점)</h3>
<ul>
  <li>관련 프로젝트 사례</li>
  <li>참여 인력의 경험</li>
  <li>성과와 교훈</li>
</ul>

<h3>5. 비용 제안서 연계 (5~10점)</h3>
<ul>
  <li>기술 구현과 비용의 연결성</li>
  <li>선택 항목별 비용 명시</li>
  <li>부가 서비스 제시</li>
</ul>

<h2>작성 팁</h2>
<ol>
  <li><strong>평가표 역산 작성</strong>: 먼저 발주청의 평가표를 분석하고 역순으로 제안서 구성</li>
  <li><strong>구체성 중시</strong>: 추상적 표현 대신 측정 가능한 지표 제시</li>
  <li><strong>시각화 활용</strong>: 다이어그램, 차트로 복잡한 내용 단순화</li>
  <li><strong>일관성 유지</strong>: 기술제안서와 비용제안서의 내용 일치</li>
</ol>

<p>매력적인 기술제안서는 낙찰의 가장 강력한 무기입니다.</p>
    `,
  },
  {
    id: 2,
    title: '나라장터 입찰 초보 가이드',
    slug: 'nara-jangter-bidding-guide',
    excerpt: '조달청 나라장터 입찰 절차를 단계별로 완벽히 안내합니다.',
    category: '입찰 절차',
    author: '조달 전문가',
    published_at: '2026-04-07',
    tags: ['나라장터', '입찰', '가이드'],
    view_count: 156,
    content_html: `
<h2>나라장터 입찰 완벽 가이드</h2>
<p>나라장터(www.g2b.go.kr)는 공공조달의 중심입니다. 올바른 절차를 따르면 성공 확률을 높일 수 있습니다.</p>

<h3>1단계: 입찰 사전 준비</h3>

<h4>1-1. 기업 정보 등록 및 인증</h4>
<ul>
  <li>조달청 회원가입 (전자인증서 필수)</li>
  <li>기업 정보 및 자격 등록</li>
  <li>원도급업체/하도급업체 분류</li>
  <li>신용도 조회 (신용평가등급, 기술용역비 적격성)</li>
</ul>

<h4>1-2. 사업 분석</h4>
<ul>
  <li>공고 검색 및 분석</li>
  <li>사업 규모 및 일정 확인</li>
  <li>자사 적격성 검토</li>
  <li>경쟁사 현황 파악</li>
</ul>

<h3>2단계: 입찰 참여 신청</h3>

<h4>2-1. 적격심사</h4>
<ul>
  <li>발주청 요청 자료 준비</li>
  <li>기술 자격 요건 충족 확인</li>
  <li>재무 상태 검증</li>
  <li>법정 필수 인증 (ISO, 보안인증 등)</li>
</ul>

<h4>2-2. 입찰 신청</h4>
<ul>
  <li>나라장터에서 입찰 신청</li>
  <li>전자인증서 서명</li>
  <li>담당자 연락처 정확히 기입</li>
  <li>신청 마감일 이전 완료</li>
</ul>

<h3>3단계: 제안서 작성</h3>

<h4>3-1. 기술제안서 작성</h4>
<ul>
  <li>발주청 요구사항 분석</li>
  <li>기술 방안 수립</li>
  <li>구현 일정 및 계획 수립</li>
  <li>품질보증 계획 수립</li>
</ul>

<h4>3-2. 비용제안서 작성</h4>
<ul>
  <li>원가 분석 (급여, 재료비, 경비, 이윤)</li>
  <li>가격 전략 수립</li>
  <li>부가 서비스 검토</li>
  <li>낙찰가 예상</li>
</ul>

<h3>4단계: 입찰 제출</h3>

<h4>4-1. 서류 최종 점검</h4>
<ul>
  <li>필수 제출 서류 확인</li>
  <li>법적 합격 요건 재확인</li>
  <li>정보 오류 여부 확인</li>
</ul>

<h4>4-2. 온라인 제출</h4>
<ul>
  <li>파일 업로드</li>
  <li>인증서 서명</li>
  <li>마감시간 5분 전 완료 (여유있게)</li>
  <li>제출 확인</li>
</ul>

<h3>5단계: 평가 및 낙찰</h3>
<ul>
  <li>적격심사 (통과/불합격)</li>
  <li>기술점수 + 가격점수 평가</li>
  <li>낙찰자 결정 (공고)</li>
  <li>계약 체결</li>
</ul>

<h2>주의사항</h2>
<ul>
  <li><strong>서명 전 3회 확인</strong>: 오타나 오류는 낙찰 취소의 원인</li>
  <li><strong>마감일 관리</strong>: 반드시 2시간 전 시스템 접속 시도</li>
  <li><strong>파일 형식</strong>: 발주청 요구 형식 정확히 준수</li>
  <li><strong>금액 오기</strong>: 비용제안서의 합계 오류는 매우 심각</li>
</ul>

<p>성공적인 나라장터 입찰은 철저한 준비에서 시작됩니다.</p>
    `,
  },
  {
    id: 3,
    title: '낙찰률을 높이는 가격제안서 전략',
    slug: 'price-proposal-strategy',
    excerpt: '경쟁력 있는 가격 제시로 낙찰률을 높이는 실전 전략을 공개합니다.',
    category: '가격 전략',
    author: '조달 전문가',
    published_at: '2026-04-06',
    tags: ['가격제안서', '전략', '낙찰'],
    view_count: 312,
    content_html: `
<h2>가격제안서 전략 A to Z</h2>
<p>공공조달에서 가격은 중요한 평가 항목입니다. 현실적인 비용 분석과 전략적 가격 설정이 낙찰의 열쇠입니다.</p>

<h3>1단계: 정확한 원가 파악</h3>

<h4>1-1. 직접비 계산</h4>
<p><strong>급여비</strong></p>
<ul>
  <li>프로젝트 관리자: 월급 × 개월수</li>
  <li>기술 인력: 기술 분야별 × 투입 개월수</li>
  <li>인건비 상한: 국가기술자격법 기준 적용</li>
</ul>

<p><strong>재료비 및 외주비</strong></p>
<ul>
  <li>구매처별 견적 수집</li>
  <li>수량 산정의 정확성</li>
  <li>부가세 제외 (세전 가격)</li>
</ul>

<p><strong>장비비</strong></p>
<ul>
  <li>구매 vs 임차 검토</li>
  <li>감가상각비 계산</li>
  <li>보험료 포함</li>
</ul>

<h4>1-2. 간접비 및 이윤</h4>
<ul>
  <li>일반관리비: 직접비의 10~20%</li>
  <li>기술료: 기술 난이도별 5~15%</li>
  <li>부가세: 세금 별도 계산</li>
</ul>

<h3>2단계: 경쟁 분석</h3>

<h4>2-1. 발주청 예정가격 분석</h4>
<ul>
  <li>공고된 예정가격 검토 (공개 경우)</li>
  <li>과거 낙찰가 조사</li>
  <li>유사 프로젝트 가격 비교</li>
</ul>

<h4>2-2. 경쟁사 분석</h4>
<ul>
  <li>경쟁사 입찰 경향</li>
  <li>시장 평균 가격대</li>
  <li>선제 이윤 조정 전략</li>
</ul>

<h3>3단계: 가격 전략 수립</h3>

<h4>3-1. 적정 가격대 결정</h4>
<p><strong>보수적 전략</strong></p>
<ul>
  <li>기술점수가 높을 경우</li>
  <li>기술점수 × 40% + 가격점수 × 60% 상황</li>
  <li>예정가격의 90~95% 범위</li>
</ul>

<p><strong>공격적 전략</strong></p>
<ul>
  <li>원가 우위가 있을 경우</li>
  <li>시장 점유율 확대 필요시</li>
  <li>예정가격의 75~85% 범위</li>
</ul>

<h4>3-2. 가격 배분 전략</h4>
<ul>
  <li>선택 항목 비용 별도 기재</li>
  <li>유지보수 비용 투명성</li>
  <li>부가 서비스 비용 명시</li>
</ul>

<h3>4단계: 제안서 작성</h3>

<h4>4-1. 가격 명세서 작성</h4>
<ul>
  <li>항목별 수량 명확히 기재</li>
  <li>단가의 합리성 입증</li>
  <li>금액 합계 정확히 계산</li>
  <li>비고란에 설명 추가 (예: PM 1명, 4인 투입)</li>
</ul>

<h4>4-2. 원가 계산서</h4>
<ul>
  <li>상세 내역서</li>
  <li>합리성 입증</li>
  <li>참고 자료 첨부</li>
</ul>

<h3>5단계: 낙찰 후 대응</h3>

<h4>5-1. 적정성 심사 대비</h4>
<ul>
  <li>원가 계산 자료 완벽 준비</li>
  <li>급여 기준 증명 서류</li>
  <li>외주비 견적서</li>
</ul>

<h4>5-2. 계약금 협상</h4>
<ul>
  <li>기술료 선행 지급 요청</li>
  <li>선금 비율 조정</li>
  <li>분할 납부 협의</li>
</ul>

<h2>주의사항</h2>
<ul>
  <li><strong>덤핑가격</strong>: 적정 이윤 없이 저가 입찰은 낙찰 후 문제 발생 가능</li>
  <li><strong>예정가격 예측</strong>: 지나친 낮춤은 의혹 초래</li>
  <li><strong>비용 증명</strong>: 모든 항목에 근거 자료 첨부</li>
  <li><strong>기술과 가격의 조화</strong>: 과도한 저가는 기술점수 감점 가능</li>
</ul>

<p>전략적 가격 책정으로 낙찰 확률을 높이세요.</p>
    `,
  },
  {
    id: 4,
    title: '발주청 평가표 완벽 분석법',
    slug: 'evaluation-criteria-analysis',
    excerpt: '평가표를 역산해서 고득점 포인트를 파악하는 방법을 소개합니다.',
    category: '입찰 전략',
    author: '조달 전문가',
    published_at: '2026-04-05',
    tags: ['평가표', '분석', '입찰전략'],
    view_count: 189,
    content_html: `
<h2>발주청 평가표 완벽 분석법</h2>
<p>공공조달에서 성공하려면 발주청의 평가표를 깊이 있게 분석해야 합니다.</p>
<p>평가표는 심사위원이 제안서를 평가할 때 사용하는 기준입니다.</p>
    `,
  },
  {
    id: 5,
    title: '발표 PT 슬라이드 구성 전략',
    slug: 'presentation-strategy',
    excerpt: '심사위원의 눈을 사로잡는 발표 자료 구성과 스토리텔링 기법을 다룹니다.',
    category: '발표 PT',
    author: '조달 전문가',
    published_at: '2026-04-04',
    tags: ['발표', 'PT', '슬라이드'],
    view_count: 98,
    content_html: `
<h2>발표 PT 슬라이드 구성 전략</h2>
<p>효과적인 발표 자료는 낙찰의 중요한 요소입니다.</p>
    `,
  },
  {
    id: 6,
    title: '2026년 공공 IT 조달 트렌드',
    slug: 'public-it-procurement-trend',
    excerpt: 'AI·클라우드·디지털전환 중심의 공공 IT 사업 발주 동향을 분석합니다.',
    category: '시장 분석',
    author: '조달 전문가',
    published_at: '2026-04-03',
    tags: ['AI', '클라우드', '조달트렌드'],
    view_count: 267,
    content_html: `
<h2>2026년 공공 IT 조달 트렌드</h2>
<p>2026년 공공 IT 조달 시장의 주요 트렌드를 분석합니다.</p>
    `,
  },
]

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

interface PageProps {
  params: {
    slug: string
  }
}

export default function BlogPostPage({ params }: PageProps) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug)

  if (!post) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-[1400px] mx-auto px-4 py-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8">
            <ChevronLeft className="w-4 h-4" />
            블로그로 돌아가기
          </Link>
          <div className="text-center py-12">
            <p className="text-gray-500">포스트를 찾을 수 없습니다.</p>
          </div>
        </div>
      </div>
    )
  }

  // 관련 글 (같은 카테고리)
  const relatedPosts = BLOG_POSTS.filter(
    (p) => p.category === post.category && p.id !== post.id
  ).slice(0, 5)

  const sanitizedHtml = DOMPurify.sanitize(post.content_html)

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4 py-12">
        {/* Back Link */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-8 group">
          <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          블로그로 돌아가기
        </Link>

        <div className="flex gap-8">
          {/* Main Content */}
          <div className="flex-1 max-w-[800px]">
            {/* Header */}
            <div className="mb-8">
              {/* Category */}
              <div className="text-sm text-gray-500 font-medium mb-2">{post.category}</div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
                <span>{post.author}</span>
                <span>·</span>
                <span>{formatDate(post.published_at)}</span>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span key={tag} className="text-xs text-gray-500">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-8" />

            {/* Content */}
            <div className="prose prose-sm max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h4:text-base prose-h4:mt-4 prose-h4:mb-2 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900 prose-ul:my-4 prose-li:my-1">
              <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-8" />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">관련 글</h2>
                <div className="grid grid-cols-1 gap-6">
                  {relatedPosts.map((relatedPost) => (
                    <Link key={relatedPost.id} href={`/blog/${relatedPost.slug}`}>
                      <div className="border border-gray-100 rounded-lg p-4 hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer">
                        <p className="text-xs text-gray-500 mb-2">{relatedPost.category}</p>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                          {relatedPost.excerpt}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-[230px] hidden lg:block">
            <div className="sticky top-[80px]">
              {/* Latest Posts */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-4">최신 글</h3>
                <div className="space-y-3">
                  {BLOG_POSTS.slice(0, 30).map((item) => (
                    <Link key={item.id} href={`/blog/${item.slug}`}>
                      <div className={`cursor-pointer transition-colors group ${item.id === post.id ? 'bg-gray-100 rounded px-2 py-1' : ''}`}>
                        <p className={`text-xs font-medium group-hover:text-blue-600 line-clamp-2 leading-snug ${item.id === post.id ? 'text-blue-600' : 'text-gray-900'}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(item.published_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
