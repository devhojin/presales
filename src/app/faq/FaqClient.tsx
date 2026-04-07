'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, MessageCircle } from 'lucide-react'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion'

const FAQ_DATA = [
  {
    category: '구매/결제',
    icon: '💳',
    items: [
      {
        q: '어떤 결제 수단을 사용할 수 있나요?',
        a: '신용카드, 체크카드, 계좌이체, 가상계좌 등 다양한 결제 수단을 지원합니다. 법인카드 결제도 가능하며, 모든 카드사가 지원됩니다.',
      },
      {
        q: '결제 후 바로 다운로드할 수 있나요?',
        a: '네, 결제 완료 즉시 다운로드가 가능합니다. 마이페이지 > 구매내역에서 언제든지 재다운로드할 수 있습니다.',
      },
      {
        q: '부가세(VAT)가 포함된 가격인가요?',
        a: '표시된 가격은 부가세(VAT 10%)가 포함된 최종 결제 금액입니다. 별도의 추가 금액은 없습니다.',
      },
      {
        q: '법인카드/세금계산서 발행이 가능한가요?',
        a: '세금계산서 발행이 필요하신 경우 contact@presales.co.kr로 사업자등록증 및 요청 내용을 보내주시면 처리해 드립니다. 법인카드 결제는 일반 카드 결제와 동일하게 진행됩니다.',
      },
    ],
  },
  {
    category: '다운로드',
    icon: '📥',
    items: [
      {
        q: '다운로드 횟수에 제한이 있나요?',
        a: '구매한 상품은 마이페이지에서 횟수 제한 없이 재다운로드 가능합니다. 단, 계정을 통한 정상적인 다운로드만 허용되며, 비정상적인 대량 다운로드는 제한될 수 있습니다.',
      },
      {
        q: '다운로드한 파일이 열리지 않아요',
        a: '파일 형식에 맞는 프로그램이 설치되어 있는지 확인해 주세요. PPT 파일은 Microsoft PowerPoint 또는 한컴오피스, HWP 파일은 한글 프로그램, PDF 파일은 Adobe Acrobat 또는 뷰어가 필요합니다. 문제가 지속되면 고객센터로 문의해 주세요.',
      },
      {
        q: '구매한 파일을 다른 사람과 공유해도 되나요?',
        a: '구매한 파일은 구매자 본인만 사용 가능합니다. 타인에게 파일을 공유하거나 재배포하는 행위는 저작권법 위반에 해당하며, 법적 책임이 따를 수 있습니다.',
      },
      {
        q: '파일 형식은 어떤 것이 있나요? (PPT, PDF, HWP 등)',
        a: '상품에 따라 제공 형식이 다릅니다. 상품 상세 페이지에서 파일 형식을 확인하실 수 있습니다. 주요 형식으로는 PPT/PPTX (발표자료), HWP (한글), PDF, XLSX (엑셀) 등이 있습니다.',
      },
    ],
  },
  {
    category: '상품/콘텐츠',
    icon: '📄',
    items: [
      {
        q: '제안서를 그대로 사용해도 되나요?',
        a: '제공되는 템플릿은 참고 자료로 활용하시되, 실제 입찰에 제출 시에는 귀사의 사업 내용에 맞게 반드시 수정/편집하여 사용하시기 바랍니다. 맞춤 작성이 필요하신 경우 전문가 컨설팅 서비스를 이용해 주세요.',
      },
      {
        q: '상품 내용을 수정/편집할 수 있나요?',
        a: '네, 구매하신 파일은 자유롭게 수정 및 편집이 가능합니다. 단, 파일을 제3자에게 재배포하거나 판매하는 행위는 금지됩니다.',
      },
      {
        q: '무료 상품과 유료 상품의 차이는 무엇인가요?',
        a: '무료 상품은 로그인 후 즉시 다운로드 가능한 기본 템플릿으로, 간단한 양식이나 가이드 문서가 제공됩니다. 유료 상품은 실제 입찰에 활용 가능한 완성도 높은 제안서 템플릿으로, 전문가가 검토한 고품질 콘텐츠가 포함되어 있습니다.',
      },
      {
        q: '원하는 유형의 제안서가 없으면 어떻게 하나요?',
        a: '전문가 컨설팅 서비스를 통해 맞춤형 제안서 작성을 의뢰하실 수 있습니다. 또는 contact@presales.co.kr로 원하시는 유형을 알려주시면 검토 후 상품화 여부를 안내해 드립니다.',
      },
    ],
  },
  {
    category: '컨설팅',
    icon: '🤝',
    items: [
      {
        q: '컨설팅은 어떻게 진행되나요?',
        a: '컨설팅 패키지 구매 후 담당 전문가가 영업일 기준 1~2일 내에 연락을 드립니다. 일정 조율 후 화상회의(Zoom/Google Meet) 또는 대면으로 진행됩니다. 컨설팅 내용은 요구사항 분석 → 전략 수립 → 제안서 검토 → 최종 피드백 순으로 진행됩니다.',
      },
      {
        q: '컨설팅 취소/환불이 가능한가요?',
        a: '컨설팅 일정 확정 전에는 전액 환불이 가능합니다. 일정 확정 후 취소 시에는 취소 시점에 따라 환불 금액이 달라질 수 있습니다. 자세한 환불 정책은 이용약관을 참고해 주세요.',
      },
      {
        q: '비대면으로만 진행되나요?',
        a: '기본적으로 화상회의(Zoom, Google Meet 등) 비대면 방식으로 진행됩니다. 대면 컨설팅이 필요하신 경우 별도로 문의해 주시면 협의 후 진행 가능합니다.',
      },
      {
        q: '컨설팅 소요 시간은 얼마나 되나요?',
        a: '패키지에 따라 다르나 일반적으로 1회 세션 기준 60~90분 내외로 진행됩니다. 복잡한 입찰 건이나 심화 컨설팅의 경우 2~3회 세션으로 나누어 진행될 수 있습니다.',
      },
    ],
  },
  {
    category: '환불/취소',
    icon: '↩️',
    items: [
      {
        q: '환불 조건은 어떻게 되나요?',
        a: '디지털 상품 특성상 다운로드 완료 후에는 원칙적으로 환불이 어렵습니다. 단, 파일이 정상적으로 열리지 않거나 상품 설명과 현저히 다른 경우에는 환불 처리가 가능합니다. 구매 후 7일 이내에 고객센터로 문의해 주세요.',
      },
      {
        q: '다운로드 전에 환불할 수 있나요?',
        a: '다운로드 전 취소/환불은 구매 후 7일 이내에 가능합니다. 마이페이지 > 구매내역에서 환불 신청을 하거나, contact@presales.co.kr로 문의해 주세요.',
      },
      {
        q: '환불 처리 기간은 얼마나 걸리나요?',
        a: '환불 승인 후 카드 결제의 경우 3~5 영업일, 계좌이체의 경우 1~3 영업일 내에 처리됩니다. 카드사 사정에 따라 소요 기간이 다소 달라질 수 있습니다.',
      },
    ],
  },
  {
    category: '계정',
    icon: '👤',
    items: [
      {
        q: '비밀번호를 잊었어요',
        a: '로그인 페이지에서 "비밀번호 찾기"를 클릭하신 후 가입 시 사용한 이메일을 입력해 주세요. 이메일로 비밀번호 재설정 링크가 발송됩니다. 이메일이 오지 않는다면 스팸함을 확인해 보세요.',
      },
      {
        q: '회원 탈퇴는 어떻게 하나요?',
        a: '마이페이지 > 계정설정에서 회원 탈퇴 신청이 가능합니다. 탈퇴 시 구매 내역 및 다운로드 권한이 모두 삭제되며, 이 작업은 되돌릴 수 없습니다. 탈퇴 전 필요한 파일을 미리 저장해 두시기 바랍니다.',
      },
      {
        q: '이메일을 변경하고 싶어요',
        a: '현재 이메일 변경 기능은 고객센터를 통해 처리되고 있습니다. contact@presales.co.kr로 현재 이메일과 변경 희망 이메일을 보내주시면 본인 확인 후 처리해 드립니다.',
      },
    ],
  },
]

export function FaqClient() {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_DATA
    const q = searchQuery.toLowerCase()
    return FAQ_DATA.map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
      ),
    })).filter((section) => section.items.length > 0)
  }, [searchQuery])

  const totalMatches = filteredData.reduce((sum, s) => sum + s.items.length, 0)

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-gradient-to-b from-muted/60 to-background border-b border-border py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">자주 묻는 질문</h1>
          <p className="text-muted-foreground text-lg mb-8">
            궁금하신 점을 빠르게 찾아보세요
          </p>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="키워드로 검색 (예: 환불, 다운로드, 결제...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
            />
          </div>

          {searchQuery && (
            <p className="mt-3 text-sm text-muted-foreground">
              &ldquo;{searchQuery}&rdquo; 검색 결과: {totalMatches}개
            </p>
          )}
        </div>
      </section>

      {/* FAQ Content */}
      <section className="container mx-auto px-4 py-12 max-w-3xl">
        {filteredData.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg mb-2">검색 결과가 없습니다</p>
            <p className="text-sm text-muted-foreground">다른 키워드로 검색하거나 아래 문의하기를 이용해 주세요.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {filteredData.map((section) => (
              <div key={section.category}>
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="text-xl">{section.icon}</span>
                  {section.category}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({section.items.length})
                  </span>
                </h2>
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <Accordion>
                    {section.items.map((item, idx) => (
                      <AccordionItem key={idx} value={`${section.category}-${idx}`}>
                        <AccordionTrigger className="px-5 py-4 text-sm font-medium hover:no-underline">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-primary/5 border border-primary/10 p-8 text-center">
          <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="text-lg font-bold mb-2">원하는 답변을 찾지 못하셨나요?</h3>
          <p className="text-sm text-muted-foreground mb-5">
            전문 컨설턴트가 직접 도와드립니다. 문의 후 영업일 기준 1일 이내 답변드립니다.
          </p>
          <Link
            href="/consulting"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            컨설팅 문의하기
          </Link>
        </div>
      </section>
    </div>
  )
}
