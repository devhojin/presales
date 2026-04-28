import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '환불정책 | PRESALES by AMARANS',
  description: 'PRESALES 환불정책 — 디지털 콘텐츠 환불 규정 및 컨설팅 취소 정책',
  alternates: {
    canonical: `${SITE_URL}/refund`,
  },
}

const sections = [
  { id: 'digital', title: '디지털 콘텐츠 환불 정책' },
  { id: 'error', title: '파일 손상/오류 처리' },
  { id: 'before-download', title: '미다운로드 취소 정책' },
  { id: 'consulting', title: '컨설팅 서비스 취소/환불' },
  { id: 'process', title: '환불 신청 절차' },
]

export default function RefundPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 md:py-20">
      <div className="mb-12">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">REFUND POLICY</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">환불정책</h1>
        <p className="text-muted-foreground text-sm">최종 수정일: 2026년 4월 7일</p>
      </div>

      {/* 목차 */}
      <nav className="border border-border rounded-xl p-6 mb-10 bg-muted/30">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">목차</h2>
        <ol className="space-y-2">
          {sections.map((s) => (
            <li key={s.id}>
              <Link
                href={`#${s.id}`}
                className="text-sm text-primary hover:underline"
              >
                {s.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10 text-sm leading-relaxed text-foreground">
        {/* 핵심 안내 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="font-bold text-amber-800 mb-3">환불정책 요약</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-amber-900">
              <thead>
                <tr className="border-b border-amber-200">
                  <th className="py-2 text-left font-semibold w-1/3">상황</th>
                  <th className="py-2 text-left font-semibold">처리 결과</th>
                </tr>
              </thead>
              <tbody className="space-y-1">
                <tr className="border-b border-amber-100">
                  <td className="py-2 font-medium">다운로드 완료 후</td>
                  <td className="py-2 text-red-700 font-semibold">환불 불가</td>
                </tr>
                <tr className="border-b border-amber-100">
                  <td className="py-2 font-medium">파일 손상/열기 오류</td>
                  <td className="py-2 text-green-700 font-semibold">동일 상품 교환 또는 전액 환불</td>
                </tr>
                <tr className="border-b border-amber-100">
                  <td className="py-2 font-medium">미다운로드 상태 7일 이내</td>
                  <td className="py-2 text-green-700 font-semibold">전액 환불</td>
                </tr>
                <tr className="border-b border-amber-100">
                  <td className="py-2 font-medium">컨설팅 — 7일 전 취소</td>
                  <td className="py-2 text-green-700 font-semibold">전액 환불</td>
                </tr>
                <tr className="border-b border-amber-100">
                  <td className="py-2 font-medium">컨설팅 — 3~7일 전 취소</td>
                  <td className="py-2 text-yellow-700 font-semibold">50% 환불</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">컨설팅 — 3일 이내 취소</td>
                  <td className="py-2 text-red-700 font-semibold">환불 불가</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 디지털 콘텐츠 환불 정책 */}
        <section id="digital">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">디지털 콘텐츠 환불 정책</h2>
          <div className="space-y-4 text-muted-foreground">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-700 mb-1">다운로드 완료 후 환불 불가</p>
              <p className="text-red-700 text-xs leading-relaxed">
                문서 템플릿(PPT, PDF, DOC, XLS, HWP 등 디지털 파일)은 다운로드 즉시 콘텐츠 전달이 완료됩니다.
                「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따라,
                복제 가능한 디지털 콘텐츠는 다운로드 후 청약 철회권이 적용되지 않습니다.
              </p>
            </div>
            <ul className="list-disc list-inside space-y-2">
              <li>다운로드 완료 시점은 서버 로그 기준으로 확인됩니다.</li>
              <li>구매 전 상품 설명과 미리보기(썸네일)를 반드시 확인하시기 바랍니다.</li>
              <li>무료 샘플이 제공되는 경우 구매 전 다운로드하여 형식을 확인하실 수 있습니다.</li>
            </ul>
          </div>
        </section>

        {/* 파일 손상/오류 */}
        <section id="error">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">파일 손상/오류 처리</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>다음과 같은 파일 하자가 확인된 경우 교환 또는 환불이 가능합니다.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>다운로드된 파일이 손상되어 열리지 않는 경우</li>
              <li>구매한 상품과 다른 파일이 제공된 경우</li>
              <li>구매 페이지에 명시된 파일 형식과 실제 파일이 다른 경우</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-blue-700 mb-1">신청 방법</p>
              <p className="text-blue-700 text-xs">
                이메일(help@presales.co.kr)로 주문번호, 상품명, 오류 상황을 첨부하여 문의하시면
                영업일 기준 1일 이내 처리됩니다. 동일 상품 재제공 또는 전액 환불 중 선택 가능합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 미다운로드 취소 */}
        <section id="before-download">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">미다운로드 취소 정책</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>결제 후 다운로드를 하지 않은 상태라면 7일 이내에 전액 환불이 가능합니다.</p>
            <ul className="list-disc list-inside space-y-2">
              <li>환불 신청 기한: 결제일로부터 7일 이내</li>
              <li>다운로드 여부는 서버 로그를 통해 확인합니다.</li>
              <li>단순 변심에 의한 취소도 미다운로드 상태라면 7일 이내 환불 가능합니다.</li>
              <li>결제 취소는 영업일 기준 3~5일 이내 카드사/결제수단에 따라 처리됩니다.</li>
            </ul>
          </div>
        </section>

        {/* 컨설팅 서비스 */}
        <section id="consulting">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">컨설팅 서비스 취소/환불</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>컨설팅 서비스는 전문가의 시간을 예약하는 서비스로, 취소 시점에 따라 환불 규정이 다릅니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">취소 시점</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">환불 금액</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">서비스 제공 7일 전까지</td>
                    <td className="px-4 py-2 text-green-700 font-semibold">결제 금액의 100%</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">서비스 제공 3~7일 전</td>
                    <td className="px-4 py-2 text-yellow-700 font-semibold">결제 금액의 50%</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">서비스 제공 3일 이내</td>
                    <td className="px-4 py-2 text-red-700 font-semibold">환불 불가</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <ul className="list-disc list-inside space-y-2">
              <li>회사의 귀책 사유로 서비스가 취소된 경우 전액 환불됩니다.</li>
              <li>일정 변경은 서비스 제공 48시간 전까지 가능합니다.</li>
            </ul>
          </div>
        </section>

        {/* 환불 신청 절차 */}
        <section id="process">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">환불 신청 절차</h2>
          <div className="space-y-4 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <span className="text-foreground font-medium">환불 신청:</span> 이메일(help@presales.co.kr)로 다음 내용을 포함하여 문의
                <ul className="mt-1 ml-5 list-disc space-y-1 text-xs">
                  <li>주문번호</li>
                  <li>상품명</li>
                  <li>환불 사유</li>
                  <li>결제 수단 및 환불 계좌 (계좌이체 결제 시)</li>
                </ul>
              </li>
              <li><span className="text-foreground font-medium">처리 확인:</span> 영업일 기준 1~3일 이내 처리 결과 이메일 안내</li>
              <li><span className="text-foreground font-medium">환불 완료:</span> 카드사/PG사 처리 기준 3~5 영업일 소요</li>
            </ol>
            <div className="bg-muted rounded-lg p-4 text-xs">
              <p className="font-semibold mb-1">고객센터</p>
              <p>이메일: help@presales.co.kr</p>
              <p>운영시간: 평일 09:00 ~ 18:00 (공휴일 제외)</p>
            </div>
          </div>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>본 환불정책은 2026년 4월 7일부터 시행됩니다.</p>
          <p className="mt-1">
            본 환불정책은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 「콘텐츠산업 진흥법」을 준수합니다.
          </p>
          <p className="mt-1">사업자: AMARANS | 대표자: 채호진</p>
        </div>
      </div>
    </div>
  )
}
