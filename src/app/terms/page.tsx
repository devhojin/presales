import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '이용약관 | PRESALES by AMARANS Partners',
  description: 'PRESALES 서비스 이용약관 — 전자상거래법 기반 이용약관 전문',
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
}

const sections = [
  { id: 'purpose', title: '제1조 (목적)' },
  { id: 'definitions', title: '제2조 (용어 정의)' },
  { id: 'service', title: '제3조 (서비스 이용)' },
  { id: 'purchase', title: '제4조 (구매 및 결제)' },
  { id: 'refund', title: '제5조 (환불 및 취소)' },
  { id: 'copyright', title: '제6조 (저작권)' },
  { id: 'disclaimer', title: '제7조 (면책)' },
  { id: 'dispute', title: '제8조 (분쟁해결)' },
]

export default function TermsPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 md:py-20">
      <div className="mb-12">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">TERMS OF SERVICE</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">이용약관</h1>
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

      <div className="prose prose-sm max-w-none space-y-10 text-sm leading-relaxed text-foreground">
        {/* 제1조 */}
        <section id="purpose">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제1조 (목적)</h2>
          <p>
            본 약관은 AMARANS Partners(이하 &quot;회사&quot;)가 운영하는 PRESALES(이하 &quot;서비스&quot;)를 이용함에 있어 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </p>
          <p className="mt-3">
            본 약관은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「전자문서 및 전자거래 기본법」, 「전자금융거래법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령에 따라 제정됩니다.
          </p>
        </section>

        {/* 제2조 */}
        <section id="definitions">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제2조 (용어 정의)</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li><span className="text-foreground font-medium">&quot;서비스&quot;</span>란 회사가 제공하는 공공조달 문서 템플릿 판매 및 전문가 컨설팅 플랫폼(PRESALES)을 의미합니다.</li>
            <li><span className="text-foreground font-medium">&quot;이용자&quot;</span>란 회사의 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 말합니다.</li>
            <li><span className="text-foreground font-medium">&quot;회원&quot;</span>이란 회사에 개인정보를 제공하여 회원 가입을 한 자로, 지속적으로 서비스를 이용할 수 있는 자를 말합니다.</li>
            <li><span className="text-foreground font-medium">&quot;디지털 콘텐츠&quot;</span>란 회사가 판매하는 문서 템플릿(PPT, PPTX, PDF, DOC, DOCX, XLS, XLSX, HWP 등 형식의 파일)을 의미합니다.</li>
            <li><span className="text-foreground font-medium">&quot;컨설팅 서비스&quot;</span>란 공공조달 입찰 제안서 작성을 위한 전문가 자문 서비스를 의미합니다.</li>
          </ol>
        </section>

        {/* 제3조 */}
        <section id="service">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제3조 (서비스 이용)</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>서비스 이용은 회사의 승낙으로 성립되며, 이용자가 회원 가입 신청을 하고 회사가 승낙함으로써 회원 계정이 생성됩니다.</li>
            <li>회원은 이메일, 이름, 회사명을 입력하여 가입할 수 있으며, 제공한 정보는 개인정보처리방침에 따라 처리됩니다.</li>
            <li>이용자는 본 약관을 위반하거나 법령에 저촉되는 행위를 하여서는 아니 됩니다.</li>
            <li>회사는 서비스 운영상 필요한 경우 사전 고지 후 서비스를 변경하거나 중단할 수 있습니다.</li>
            <li>무료 콘텐츠는 회원 가입 없이도 이용할 수 있으나, 다운로드 시 회원 가입이 필요할 수 있습니다.</li>
          </ol>
        </section>

        {/* 제4조 */}
        <section id="purchase">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제4조 (구매 및 결제)</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>이용자는 서비스 내에서 디지털 콘텐츠 및 컨설팅 서비스를 구매할 수 있습니다.</li>
            <li>결제 수단은 신용카드, 체크카드, 계좌이체, 간편결제 등 회사가 정한 방법으로 진행됩니다.</li>
            <li>구매 계약은 이용자의 구매 신청과 회사의 결제 승인으로 체결됩니다.</li>
            <li>디지털 콘텐츠의 경우 결제 완료 즉시 다운로드가 가능합니다.</li>
            <li>컨설팅 서비스는 별도 협의된 일정에 따라 제공됩니다.</li>
            <li>가격은 원칙적으로 부가가치세를 포함한 금액으로 표시됩니다.</li>
          </ol>
        </section>

        {/* 제5조 */}
        <section id="refund">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제5조 (환불 및 취소)</h2>
          <div className="space-y-4 text-muted-foreground">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="font-semibold text-red-700 text-xs mb-1">중요 안내</p>
              <p className="text-red-700 font-medium">
                디지털 콘텐츠(문서 템플릿)는 다운로드 완료 후 환불이 불가합니다. 이는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 제2항 제5호에 따른 디지털 콘텐츠 특성에 기인합니다.
              </p>
            </div>
            <ol className="list-decimal list-inside space-y-2">
              <li><span className="text-foreground font-medium">다운로드 전 취소:</span> 결제 후 다운로드를 하지 않은 경우 7일 이내에 환불 신청이 가능합니다.</li>
              <li><span className="text-foreground font-medium">파일 손상/오류:</span> 파일이 손상되었거나 정상적으로 열리지 않는 경우, 동일 상품으로 교환하거나 환불을 받을 수 있습니다.</li>
              <li><span className="text-foreground font-medium">컨설팅 서비스:</span> 서비스 제공 7일 전까지 취소 시 전액 환불, 3~7일 전 취소 시 50% 환불, 3일 이내 취소 시 환불 불가합니다.</li>
              <li>환불 신청은 이메일(contact@presales.co.kr)로 접수하며, 영업일 기준 3일 이내 처리됩니다.</li>
            </ol>
          </div>
        </section>

        {/* 제6조 */}
        <section id="copyright">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제6조 (저작권)</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>서비스 내 모든 콘텐츠의 저작권은 회사 또는 원작자에게 있습니다.</li>
            <li>이용자는 구매한 디지털 콘텐츠를 개인 또는 소속 기업의 업무 목적으로만 사용할 수 있습니다.</li>
            <li>구매한 콘텐츠를 제3자에게 재판매, 배포, 공유, 게시하는 행위는 엄격히 금지됩니다.</li>
            <li>저작권 침해 시 민·형사상 책임이 발생할 수 있습니다.</li>
          </ol>
        </section>

        {/* 제7조 */}
        <section id="disclaimer">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제7조 (면책)</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>회사는 천재지변, 전쟁, 통신장애 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.</li>
            <li>이용자가 제공한 정보의 허위 기재로 인한 불이익에 대해 회사는 책임을 지지 않습니다.</li>
            <li>회사는 제공되는 문서 템플릿을 이용한 입찰 결과(낙찰, 탈락 등)에 대해 보장하지 않습니다.</li>
            <li>제3자 간의 거래 또는 분쟁에 대해 회사는 개입하지 않으며 이에 따른 손해를 책임지지 않습니다.</li>
          </ol>
        </section>

        {/* 제8조 */}
        <section id="dispute">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제8조 (분쟁해결)</h2>
          <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
            <li>본 약관과 관련한 분쟁은 대한민국 법률에 따라 처리됩니다.</li>
            <li>서비스 이용과 관련하여 발생한 분쟁의 소송 관할법원은 서울중앙지방법원으로 합니다.</li>
            <li>이용자는 전자상거래 분쟁조정위원회(www.ecmc.or.kr)에 분쟁 조정을 신청할 수 있습니다.</li>
          </ol>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>부칙: 본 약관은 2026년 4월 7일부터 시행됩니다.</p>
          <p className="mt-1">사업자: AMARANS Partners | 대표자: 채호진 | 문의: contact@presales.co.kr</p>
        </div>
      </div>
    </div>
  )
}
