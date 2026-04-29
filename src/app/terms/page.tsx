import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '이용약관 | PRESALES by AMARANS',
  description: 'PRESALES 문서 스토어, 컨설팅, 모닝 브리프, 채팅 상담, 디지털 콘텐츠 구매에 관한 이용약관입니다.',
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
}

const sections = [
  { id: 'purpose', title: '제1조 목적' },
  { id: 'definitions', title: '제2조 용어 정의' },
  { id: 'notice', title: '제3조 약관의 게시와 변경' },
  { id: 'account', title: '제4조 회원가입과 계정 관리' },
  { id: 'service', title: '제5조 서비스의 내용' },
  { id: 'purchase', title: '제6조 구매와 결제' },
  { id: 'download', title: '제7조 디지털 콘텐츠 이용' },
  { id: 'consulting', title: '제8조 컨설팅 서비스' },
  { id: 'refund', title: '제9조 취소·환불·청약철회' },
  { id: 'contents', title: '제10조 게시물·리뷰·채팅' },
  { id: 'prohibited', title: '제11조 금지행위' },
  { id: 'ip', title: '제12조 지식재산권' },
  { id: 'liability', title: '제13조 보증 제한과 면책' },
  { id: 'privacy', title: '제14조 개인정보 보호' },
  { id: 'dispute', title: '제15조 준거법과 분쟁해결' },
]

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 border-b border-border pb-2 text-base font-bold">
      {children}
    </h2>
  )
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[920px] px-4 py-16 md:px-8 md:py-20">
      <div className="mb-12">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">TERMS OF SERVICE</p>
        <h1 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">이용약관</h1>
        <p className="text-sm text-muted-foreground">최종 수정일 및 시행일: 2026년 4월 27일</p>
      </div>

      <nav className="mb-10 rounded-xl border border-border bg-muted/30 p-6">
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">목차</h2>
        <ol className="grid gap-2 sm:grid-cols-2">
          {sections.map((section) => (
            <li key={section.id}>
              <Link href={`#${section.id}`} className="text-sm text-primary hover:underline">
                {section.title}
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <div className="space-y-10 text-sm leading-relaxed text-foreground">
        <section className="space-y-3">
          <SectionTitle id="purpose">제1조 목적</SectionTitle>
          <p>
            본 약관은 AMARANS(이하 &quot;회사&quot;)가 운영하는 PRESALES 웹사이트 및 관련 서비스(이하 &quot;서비스&quot;)를 이용함에 있어 회사와 이용자의 권리, 의무 및 책임사항, 서비스 이용조건과 절차를 정하는 것을 목적으로 합니다.
          </p>
          <p className="text-muted-foreground">
            본 약관은 「전자상거래 등에서의 소비자보호에 관한 법률」, 「약관의 규제에 관한 법률」, 「전자문서 및 전자거래 기본법」, 「콘텐츠산업 진흥법」 등 관련 법령을 반영하여 작성되었습니다.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle id="definitions">제2조 용어 정의</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li><span className="font-medium text-foreground">서비스</span>란 회사가 제공하는 공공조달 문서 스토어, 입찰 공고, IT피드, 모닝 브리프, 컨설팅, 채팅 상담, 마이페이지, 관리자 기능 등 PRESALES 관련 기능 일체를 말합니다.</li>
            <li><span className="font-medium text-foreground">이용자</span>란 서비스에 접속하여 본 약관에 따라 서비스를 이용하는 회원과 비회원을 말합니다.</li>
            <li><span className="font-medium text-foreground">회원</span>이란 이메일 기반 인증 또는 회사가 제공하는 인증 방식으로 계정을 생성한 이용자를 말합니다.</li>
            <li><span className="font-medium text-foreground">디지털 콘텐츠</span>란 회사가 제공하거나 판매하는 PPT, PPTX, PDF, HWP, DOC, DOCX, XLS, XLSX, ZIP 등 전자파일 형태의 문서, 템플릿, 가이드, 샘플을 말합니다.</li>
            <li><span className="font-medium text-foreground">컨설팅 서비스</span>란 공공조달 제안서 구조 검토, 평가표 대응, 발표 준비, 프로젝트 동행 등 회사가 제공하는 유료 또는 무료 자문 서비스를 말합니다.</li>
            <li><span className="font-medium text-foreground">주문</span>이란 이용자가 디지털 콘텐츠 또는 컨설팅 서비스 구매를 신청하고 회사가 이를 접수 또는 결제 승인한 거래 단위를 말합니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="notice">제3조 약관의 게시와 변경</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>회사는 이용자가 쉽게 확인할 수 있도록 본 약관을 서비스 하단 또는 별도 약관 페이지에 게시합니다.</li>
            <li>회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
            <li>중요한 권리·의무에 영향을 미치는 변경은 적용일 7일 전부터, 이용자에게 불리하거나 중대한 변경은 30일 전부터 서비스 내 공지 또는 이메일 등 가능한 방법으로 고지합니다.</li>
            <li>이용자가 변경 약관 적용일 이후 서비스를 계속 이용하는 경우 변경 약관에 동의한 것으로 봅니다. 다만 법령상 명시적 동의가 필요한 경우 회사는 별도 동의를 받습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="account">제4조 회원가입과 계정 관리</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>회원가입은 이용자가 필수 동의 항목과 가입 정보를 입력하고 회사가 이를 승낙함으로써 완료됩니다.</li>
            <li>회원은 정확한 정보를 제공해야 하며, 허위 정보 또는 타인의 정보를 이용하여 가입할 수 없습니다.</li>
            <li>비밀번호는 이용자가 직접 관리해야 하며, 관리 소홀 또는 제3자 사용으로 인한 손해는 이용자에게 책임이 있습니다.</li>
            <li>회사는 보안을 위해 비밀번호 정책, 로그인 실패 제한, 세션 만료 등 보호 조치를 적용할 수 있습니다.</li>
            <li>회원은 마이페이지 또는 고객지원 채널을 통해 회원탈퇴를 요청할 수 있습니다. 단, 법령상 보관이 필요한 거래·분쟁 기록은 정해진 기간 동안 보관될 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="service">제5조 서비스의 내용</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>회사는 공공조달 제안서 템플릿, 입찰 가이드, 무료 자료, 유료 디지털 콘텐츠, 입찰 공고 정보, IT피드, 모닝 브리프, 컨설팅 문의, 채팅 상담, 구매 내역 및 다운로드 관리 기능을 제공합니다.</li>
            <li>입찰 공고, IT피드, 모닝 브리프 등 정보성 콘텐츠는 외부 공개 정보, 자동 수집 정보, 내부 편집 정보를 바탕으로 제공될 수 있습니다.</li>
            <li>회사는 서비스의 품질 개선, 보안 점검, 장애 대응, 정책 변경, 외부 서비스 장애 등의 사유가 있는 경우 서비스 일부 또는 전부를 변경·중단할 수 있습니다.</li>
            <li>회사는 무료 자료, 쿠폰, 프로모션, 채팅 상담 기능의 제공 범위와 조건을 운영정책에 따라 변경할 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="purchase">제6조 구매와 결제</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>이용자는 서비스에서 제공하는 상품 상세정보, 가격, 파일 형식, 제공 조건, 환불 조건을 확인한 뒤 구매를 신청합니다.</li>
            <li>구매계약은 결제 승인, 무료 주문 생성, 무통장 입금 확인, 가상계좌 입금 확인 또는 회사의 별도 승인 중 해당 거래 방식에 맞는 절차가 완료된 때 성립합니다.</li>
            <li>결제수단은 신용카드, 간편결제, 가상계좌, 무통장입금, 무료 주문, 채팅 결제 요청 등 회사가 제공하는 방식 중에서 선택할 수 있습니다.</li>
            <li>카드번호 등 민감한 결제정보는 결제대행사가 처리하며 회사는 이를 직접 저장하지 않습니다. 회사는 주문번호, 결제키, 결제수단, 결제상태, 현금영수증 URL 등 거래 확인에 필요한 정보를 저장할 수 있습니다.</li>
            <li>쿠폰, 묶음 할인, 상품별 할인 조건은 발급 시 고지된 조건에 따릅니다. 부정 사용, 시스템 오류, 결제 취소가 확인되면 쿠폰 적용 또는 주문이 취소될 수 있습니다.</li>
            <li>세금계산서 또는 현금영수증 발급을 위해 사업자등록증, 담당자 연락처, 발급 메모 등 추가 자료를 요청할 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="download">제7조 디지털 콘텐츠 이용</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>유료 디지털 콘텐츠는 결제 완료 후 마이페이지 또는 주문 화면에서 다운로드할 수 있습니다.</li>
            <li>다운로드 링크는 보안을 위해 서버에서 구매 여부를 확인한 뒤 제한된 시간 동안 유효한 서명 URL로 제공될 수 있습니다.</li>
            <li>상품 설명에 명시된 파일 형식, 구성, 미리보기, 상세 설명은 구매 판단을 돕기 위한 정보입니다. 이용자는 구매 전 필요한 호환 프로그램과 사용 환경을 확인해야 합니다.</li>
            <li>무료 콘텐츠도 저작권과 이용범위 제한이 적용되며, 회사가 정한 방식 외의 대량 수집, 자동 다운로드, 재배포는 금지됩니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="consulting">제8조 컨설팅 서비스</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>컨설팅 서비스는 스팟 상담, 제안서 리뷰, 프로젝트 동행 등 서비스 페이지에 표시된 상품 또는 별도 합의한 범위로 제공됩니다.</li>
            <li>이용자는 컨설팅 신청 시 이름, 연락처, 이메일, 회사명, 문의 내용, 첨부파일 등 검토에 필요한 정보를 정확히 제공해야 합니다.</li>
            <li>이용자가 제출한 RFP, 제안서, 사업계획서, 첨부파일에 제3자의 영업비밀, 개인정보, 저작물이 포함된 경우 적법한 권한과 책임은 이용자에게 있습니다.</li>
            <li>컨설팅은 제안서 품질 개선과 평가 대응을 돕는 자문이며, 특정 평가점수, 수주, 낙찰, 계약 체결을 보장하지 않습니다.</li>
            <li>컨설팅 일정, 산출물, 진행 방식은 상품별 설명 또는 양 당사자의 별도 합의에 따릅니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="refund">제9조 취소·환불·청약철회</SectionTitle>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <p className="text-xs font-semibold">디지털 콘텐츠 환불 안내</p>
            <p className="mt-1">
              디지털 콘텐츠는 다운로드 또는 열람이 시작되면 단순 변심에 따른 청약철회가 제한될 수 있습니다. 다만 파일 손상 또는 열기 오류 등 하자가 확인된 경우에는 회사 정책에 따라 동일 상품 교환으로 처리합니다.
            </p>
          </div>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>디지털 콘텐츠를 다운로드하지 않은 경우 이용자는 결제일로부터 7일 이내에 환불을 요청할 수 있으며, 회사는 미다운로드 상태를 확인한 후 전액 환불로 처리합니다.</li>
            <li>파일이 손상되었거나 열기 오류가 있는 경우 이용자는 문제 확인을 위해 주문번호, 오류 화면, 파일명 등 필요한 자료를 제출해야 하며, 회사는 하자 확인 후 동일 상품 교환으로 처리합니다.</li>
            <li>가상계좌 또는 무통장입금 주문은 입금 전까지 주문 대기 상태이며, 기한 내 미입금 시 자동 취소될 수 있습니다.</li>
            <li>환불은 원칙적으로 결제수단 취소 방식으로 처리하며, 결제수단 또는 PG사 정책에 따라 처리 시간이 달라질 수 있습니다.</li>
            <li>환불 문의는 서비스 내 문의, 채팅 상담 또는 이메일(help@presales.co.kr)로 접수합니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="contents">제10조 게시물·리뷰·채팅</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>이용자가 작성한 리뷰, 채팅 메시지, 문의 내용, 첨부파일의 권리와 책임은 작성자에게 있습니다.</li>
            <li>회사는 서비스 운영, 고객지원, 품질 개선, 분쟁 대응을 위해 이용자가 작성한 내용을 확인·보관할 수 있습니다.</li>
            <li>회사는 욕설, 명예훼손, 허위 사실, 개인정보 노출, 저작권 침해, 광고성 게시물, 서비스 운영 방해 게시물을 숨김, 삭제 또는 이용 제한할 수 있습니다.</li>
            <li>상품 리뷰는 구매자 경험 공유를 위한 기능이며, 회사는 허위 리뷰, 반복 리뷰, 대가성 리뷰, 악의적 리뷰를 제한할 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="prohibited">제11조 금지행위</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>타인의 계정, 결제수단, 개인정보를 도용하는 행위</li>
            <li>디지털 콘텐츠를 무단 복제, 재판매, 공유, 배포, 공개 게시하는 행위</li>
            <li>자동화 도구로 콘텐츠, 공고, 피드, 상품 정보를 대량 수집하거나 서비스 안정성을 해치는 행위</li>
            <li>허위 주문, 결제 취소 악용, 쿠폰 부정 사용, 리뷰 조작 등 공정한 거래를 방해하는 행위</li>
            <li>악성코드 업로드, 비정상 요청, 보안 취약점 악용, 무단 접근 등 서비스 보안을 침해하는 행위</li>
            <li>관련 법령 또는 본 약관, 개별 안내, 운영정책을 위반하는 행위</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="ip">제12조 지식재산권</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>서비스, 디자인, 데이터베이스, 상품 설명, 썸네일, 문서 템플릿, 가이드, 편집 콘텐츠의 지식재산권은 회사 또는 정당한 권리자에게 있습니다.</li>
            <li>이용자는 구매한 디지털 콘텐츠를 본인 또는 소속 조직의 내부 업무, 제안서 작성, 발표 준비 목적으로 사용할 수 있습니다.</li>
            <li>별도 서면 허락 없이 구매 콘텐츠를 제3자에게 판매, 임대, 양도, 공유, 배포하거나 공개 저장소·오픈 채팅방·커뮤니티에 게시할 수 없습니다.</li>
            <li>이용자가 서비스에 제출한 자료의 소유권은 이용자에게 있으나, 회사는 컨설팅 수행, 고객지원, 분쟁 대응, 보안 점검을 위해 필요한 범위에서 이를 이용할 수 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="liability">제13조 보증 제한과 면책</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>회사는 서비스의 안정적 제공을 위해 노력하지만, 천재지변, 통신망 장애, 클라우드·PG·이메일·데이터베이스 등 외부 서비스 장애, 긴급 보안 조치로 인한 서비스 중단에 대해 고의 또는 중대한 과실이 없는 한 책임을 지지 않습니다.</li>
            <li>입찰 공고, IT피드, 모닝 브리프 등 정보성 콘텐츠는 이용자의 의사결정을 보조하기 위한 자료이며, 이용자는 원문 공고와 발주기관 자료를 직접 확인해야 합니다.</li>
            <li>회사는 디지털 콘텐츠 또는 컨설팅 이용 결과로 특정 입찰에서 낙찰, 선정, 평가점수, 매출, 수익이 발생함을 보장하지 않습니다.</li>
            <li>이용자가 부정확한 정보 제공, 권한 없는 자료 제출, 법령 위반, 제3자 권리 침해로 손해를 발생시킨 경우 그 책임은 이용자에게 있습니다.</li>
          </ol>
        </section>

        <section className="space-y-3">
          <SectionTitle id="privacy">제14조 개인정보 보호</SectionTitle>
          <p className="text-muted-foreground">
            회사는 서비스 제공을 위해 필요한 최소한의 개인정보를 처리하며, 처리 목적과 보유기간, 위탁·국외이전, 권리행사 절차 등은 <Link href="/privacy" className="text-primary underline underline-offset-4">개인정보처리방침</Link>에 따릅니다.
          </p>
        </section>

        <section className="space-y-3">
          <SectionTitle id="dispute">제15조 준거법과 분쟁해결</SectionTitle>
          <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>본 약관은 대한민국 법령에 따라 해석됩니다.</li>
            <li>회사와 이용자는 분쟁이 발생한 경우 성실히 협의하여 해결하도록 노력합니다.</li>
            <li>전자상거래 관련 분쟁은 한국소비자원, 전자문서·전자거래분쟁조정위원회, 콘텐츠분쟁조정위원회 등 관련 기관의 조정 절차를 이용할 수 있습니다.</li>
            <li>소송이 제기되는 경우 관련 법령에서 정한 관할 법원에 따릅니다.</li>
          </ol>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>부칙: 본 약관은 2026년 4월 27일부터 시행됩니다.</p>
          <p className="mt-1">사업자: AMARANS | 대표자: 채호진 | 문의: help@presales.co.kr</p>
        </div>
      </div>
    </div>
  )
}
