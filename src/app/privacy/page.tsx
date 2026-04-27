import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '개인정보처리방침 | PRESALES by AMARANS Partners',
  description:
    'PRESALES가 수집·이용하는 개인정보 항목, 처리 목적, 보유기간, 위탁, 국외 이전, 정보주체 권리를 안내합니다.',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
}

const sections = [
  { id: 'scope', title: '제1조 목적과 적용 범위' },
  { id: 'collected', title: '제2조 수집하는 개인정보' },
  { id: 'purpose', title: '제3조 처리 목적' },
  { id: 'retention', title: '제4조 보유 및 이용기간' },
  { id: 'children', title: '제5조 아동의 개인정보' },
  { id: 'third-party', title: '제6조 제3자 제공' },
  { id: 'outsourcing', title: '제7조 처리업무 위탁' },
  { id: 'overseas', title: '제8조 국외 이전' },
  { id: 'destruction', title: '제9조 파기 절차와 방법' },
  { id: 'rights', title: '제10조 정보주체의 권리' },
  { id: 'cookies', title: '제11조 쿠키와 행태정보' },
  { id: 'safety', title: '제12조 안전성 확보조치' },
  { id: 'manager', title: '제13조 개인정보 보호책임자' },
  { id: 'remedy', title: '제14조 권익침해 구제' },
  { id: 'changes', title: '제15조 방침 변경' },
]

const personalDataRows = [
  {
    category: '회원가입·계정',
    items:
      '이메일, 비밀번호 인증 정보, 이름, 회사명, 휴대전화번호, 약관·개인정보·국외 이전·마케팅 수신 동의 여부와 일시',
    method: '회원이 가입 화면에서 직접 입력하거나 동의합니다.',
  },
  {
    category: '로그인·보안',
    items:
      '로그인 실패 횟수, 계정 잠금 시각, 세션 쿠키, 마지막 활동 시각, IP 주소, 사용자 에이전트, 요청 로그',
    method: '서비스 이용 과정에서 자동 생성·수집됩니다.',
  },
  {
    category: '상품 구매·결제',
    items:
      '주문번호, 상품 및 주문 내역, 결제수단, 결제키, 결제상태, 결제일시, 금액, 쿠폰·할인 내역, 환불 사유, 가상계좌·현금영수증·영수증 처리에 필요한 결제 메타데이터',
    method: '주문서 작성, 결제 승인·취소·환불 처리 과정에서 수집됩니다.',
  },
  {
    category: '세금계산서·증빙',
    items:
      '세금계산서 담당자 연락처, 사업자등록증 파일명·경로, 입금 메모, 카드 결제 메모, 현금영수증 발급 정보',
    method: '구매자가 주문서 또는 결제 관련 화면에서 입력·업로드합니다.',
  },
  {
    category: '컨설팅 문의',
    items: '이름, 전화번호, 이메일, 회사명, 신청 패키지, 문의 내용, 첨부파일',
    method: '컨설팅 신청 화면에서 직접 입력·업로드합니다.',
  },
  {
    category: '채팅·고객지원',
    items:
      '게스트 식별자, 채팅방 정보, 메시지 내용, 첨부파일 URL·파일명·크기·유형, 읽음 여부, 결제 요청 관련 정보',
    method: '실시간 문의 및 상담 이용 과정에서 수집됩니다.',
  },
  {
    category: '모닝브리프',
    items: '이메일, 이름, 가입 경로, 구독 토큰, 구독 상태, 발송 횟수, 최근 발송일, 해지일',
    method: '구독 신청, 발송, 수신거부 처리 과정에서 수집됩니다.',
  },
  {
    category: '리뷰·참여 기능',
    items:
      '작성자명, 이메일, 평점, 제목, 내용, 장점·단점, 이미지, 추천 여부, 검증된 구매 여부',
    method: '회원이 리뷰 또는 관련 참여 기능을 사용할 때 수집됩니다.',
  },
  {
    category: '이용 기록·분석',
    items:
      '방문 경로, 페이지 경로, 세션 식별자, 장바구니·북마크·쿠폰·다운로드 기록, GA4 이벤트 데이터(설정된 경우)',
    method: '서비스 이용 과정에서 자동 생성되거나 브라우저 저장소에 저장됩니다.',
  },
]

const retentionRows = [
  {
    item: '회원 프로필과 계정 정보',
    period: '회원 탈퇴 또는 계정 삭제 요청 시까지',
    basis: '서비스 제공 및 회원 관리. 단, 법령상 보존 의무가 있는 정보는 해당 기간 보관',
  },
  {
    item: '계약 또는 청약철회 등에 관한 기록',
    period: '5년',
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
  },
  {
    item: '대금결제 및 재화 등의 공급에 관한 기록',
    period: '5년',
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
  },
  {
    item: '소비자 불만 또는 분쟁처리에 관한 기록',
    period: '3년',
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
  },
  {
    item: '표시·광고에 관한 기록',
    period: '6개월',
    basis: '전자상거래 등에서의 소비자보호에 관한 법률',
  },
  {
    item: '세금계산서, 현금영수증, 회계 증빙 자료',
    period: '5년',
    basis: '부가가치세법, 국세기본법 등 세법상 보존 의무',
  },
  {
    item: '접속 로그와 부정이용 방지 기록',
    period: '3개월',
    basis: '통신비밀보호법 및 서비스 보안 목적',
  },
  {
    item: '모닝브리프 구독 정보',
    period: '구독 해지 또는 동의 철회 시까지',
    basis: '구독 발송 및 수신거부 관리',
  },
  {
    item: '상담·채팅·컨설팅 문의 기록',
    period: '목적 달성 후 지체 없이 파기. 분쟁 대응이 필요한 경우 3년',
    basis: '문의 처리, 계약 이행, 분쟁 대응',
  },
]

const outsourcingRows = [
  {
    company: 'Supabase Inc.',
    task: '회원 인증, 데이터베이스, 파일 저장소, 접근 권한 관리',
    data: '회원 정보, 주문·상담·채팅·리뷰 데이터, 업로드 파일',
  },
  {
    company: 'Vercel Inc.',
    task: '웹사이트 호스팅, 배포, 네트워크 전송, 서버 로그 관리',
    data: '접속 로그, IP 주소, 사용자 에이전트, 페이지 요청 정보',
  },
  {
    company: '토스페이먼츠 주식회사',
    task: '신용카드·간편결제·가상계좌 결제, 결제 승인·취소·환불, 현금영수증 처리',
    data: '결제 식별자, 주문·금액 정보, 결제수단 정보, 현금영수증 발급 정보',
  },
  {
    company: '메일플러그 주식회사',
    task: '주문 확인, 상담 접수, 모닝브리프 등 이메일 발송',
    data: '이메일, 이름, 주문·상담·구독 관련 발송 내용',
  },
  {
    company: 'Google LLC',
    task: '웹 분석(GA4 측정 ID가 설정된 경우에만 활성화)',
    data: '페이지 경로, 이벤트, 기기·브라우저 정보, 쿠키 식별자',
  },
  {
    company: 'Upstash Inc.',
    task: '요청 속도 제한 및 부정이용 방지(환경변수가 설정된 경우)',
    data: 'IP 기반 제한 키, 요청 횟수, 제한 시각',
  },
]

const overseasRows = [
  {
    recipient: 'Supabase Inc.',
    country: '싱가포르 및 미국',
    items: '회원 정보, 주문·상담·채팅·리뷰 데이터, 업로드 파일',
    purpose: '인증, 데이터베이스, 파일 저장소 운영과 기술 지원',
    period: '회원 탈퇴 또는 위탁계약 종료 시까지. 법령 보존 대상은 해당 기간',
  },
  {
    recipient: 'Vercel Inc.',
    country: '미국 및 글로벌 엣지 리전',
    items: 'IP 주소, 사용자 에이전트, 접속 로그, 페이지 요청 정보',
    purpose: '웹사이트 호스팅, 배포, 보안 로그 관리',
    period: '서비스 제공 및 로그 보관 목적 달성 시까지',
  },
  {
    recipient: 'Google LLC',
    country: '미국',
    items: 'GA4 이벤트, 페이지 경로, 기기·브라우저 정보, 쿠키 식별자',
    purpose: '서비스 이용 통계 분석',
    period: 'Google Analytics 설정 및 계약에 따른 보관기간',
  },
  {
    recipient: 'Upstash Inc.',
    country: '미국 및 선택 리전',
    items: 'IP 기반 제한 키, 요청 횟수, 제한 시각',
    purpose: '부정이용 방지와 요청 속도 제한',
    period: '제한 목적 달성 또는 위탁계약 종료 시까지',
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 md:py-20">
      <div className="mb-12">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">PRIVACY POLICY</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">개인정보처리방침</h1>
        <p className="text-muted-foreground text-sm">최종 수정일: 2026년 4월 27일</p>
      </div>

      <nav className="border border-border rounded-xl p-6 mb-10 bg-muted/30">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3">목차</h2>
        <ol className="space-y-2">
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
        <p className="text-muted-foreground">
          AMARANS Partners(이하 &quot;회사&quot;)는 PRESALES 및 presales.co.kr 관련 서비스(이하
          &quot;서비스&quot;)를 운영하면서 개인정보 보호법 등 관련 법령을 준수합니다. 회사는 개인정보가
          어떤 목적으로 수집·이용되고 어떻게 보호되는지 알리기 위해 본 개인정보처리방침을 공개합니다.
        </p>

        <section id="scope">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제1조 목적과 적용 범위</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              본 방침은 서비스의 회원가입, 로그인, 상품 구매, 결제, 자료 다운로드, 컨설팅 문의, 채팅
              상담, 모닝브리프 구독, 리뷰 작성, 관리자 응대, 이벤트 및 마케팅 수신 기능에 적용됩니다.
            </p>
            <p>
              서비스 안에서 외부 사이트, 결제창, 자료 제공처로 이동하는 경우 해당 외부 서비스의
              개인정보처리방침이 별도로 적용될 수 있습니다.
            </p>
          </div>
        </section>

        <section id="collected">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제2조 수집하는 개인정보</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              회사는 서비스 제공에 필요한 최소한의 개인정보를 수집합니다. 필수 항목을 제공하지 않을
              경우 회원가입, 구매, 다운로드, 상담 등 일부 기능 이용이 제한될 수 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">구분</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수집 항목</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수집 방법</th>
                  </tr>
                </thead>
                <tbody>
                  {personalDataRows.map((row) => (
                    <tr key={row.category} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 font-medium text-foreground">{row.category}</td>
                      <td className="px-4 py-2">{row.items}</td>
                      <td className="px-4 py-2">{row.method}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs">
              신용카드 번호, 계좌 비밀번호 등 결제수단의 민감한 원천 정보는 결제대행사가 처리하며,
              회사는 결제 승인·취소·환불과 증빙 발급에 필요한 식별 정보와 처리 결과만 보관합니다.
            </p>
          </div>
        </section>

        <section id="purpose">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제3조 처리 목적</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>
              <span className="text-foreground font-medium">회원 관리:</span> 본인 식별, 계정 생성, 로그인,
              세션 관리, 회원 탈퇴, 부정 이용 방지, 약관 위반 대응
            </li>
            <li>
              <span className="text-foreground font-medium">상품 제공:</span> 공공조달 제안서·템플릿·디지털
              자료 구매, 다운로드 권한 확인, 구매 내역과 마이페이지 제공
            </li>
            <li>
              <span className="text-foreground font-medium">결제·정산:</span> 주문 생성, 결제 승인·취소·환불,
              쿠폰 적용, 가상계좌 안내, 현금영수증·세금계산서 등 증빙 발급
            </li>
            <li>
              <span className="text-foreground font-medium">상담과 고객지원:</span> 컨설팅 신청 처리, 채팅
              상담, 첨부자료 검토, 오류·불만·분쟁 처리, 공지 전달
            </li>
            <li>
              <span className="text-foreground font-medium">콘텐츠 운영:</span> 모닝브리프 발송, 입찰공고·IT
              피드·상품 추천, 리뷰 운영, 북마크·장바구니·쿠폰 관리
            </li>
            <li>
              <span className="text-foreground font-medium">보안과 품질 개선:</span> 접속 통계, 장애 분석,
              속도 제한, 악성 요청 차단, 서비스 사용성 개선
            </li>
            <li>
              <span className="text-foreground font-medium">마케팅:</span> 이용자가 동의한 경우에 한해 신규
              상품, 혜택, 이벤트, 프로모션 소식을 발송
            </li>
          </ol>
        </section>

        <section id="retention">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제4조 보유 및 이용기간</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              회사는 개인정보 수집·이용 목적이 달성되면 지체 없이 파기합니다. 다만 관계 법령에 따라
              보존해야 하는 정보는 아래 기간 동안 분리 보관한 뒤 파기합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">항목</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">보유기간</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">근거</th>
                  </tr>
                </thead>
                <tbody>
                  {retentionRows.map((row) => (
                    <tr key={row.item} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 font-medium text-foreground">{row.item}</td>
                      <td className="px-4 py-2">{row.period}</td>
                      <td className="px-4 py-2">{row.basis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="children">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제5조 아동의 개인정보</h2>
          <p className="text-muted-foreground">
            서비스는 사업자, 제안 담당자, 프리랜서, 성인 이용자를 대상으로 하며 만 14세 미만 아동의
            개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만 아동의 정보가 수집된 사실을 확인하면
            법령에 따라 지체 없이 삭제하거나 필요한 조치를 취합니다.
          </p>
        </section>

        <section id="third-party">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제6조 제3자 제공</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              회사는 이용자의 개인정보를 본 방침의 처리 목적 범위 안에서만 이용하며, 원칙적으로 제3자에게
              제공하지 않습니다. 다만 아래의 경우에는 필요한 범위에서 제공할 수 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령에 특별한 규정이 있거나 수사기관 등 권한 있는 기관이 적법한 절차에 따라 요구한 경우</li>
              <li>결제, 현금영수증, 세금계산서, 환불, 분쟁 조정 등 거래 이행과 법령상 의무 수행에 필요한 경우</li>
            </ol>
            <p>
              결제 승인, 현금영수증, 세금계산서 등은 결제기관, 국세청, 금융기관 등 법령과 거래 처리에
              필요한 기관을 통해 처리될 수 있습니다.
            </p>
          </div>
        </section>

        <section id="outsourcing">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제7조 처리업무 위탁</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              회사는 안정적인 서비스 운영을 위해 다음과 같이 개인정보 처리업무를 위탁합니다. 회사는
              위탁계약 또는 서비스 약관을 통해 개인정보의 목적 외 처리 금지, 안전성 확보, 재위탁 제한,
              관리·감독에 관한 사항을 확인합니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수탁자</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">위탁 업무</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">처리 항목</th>
                  </tr>
                </thead>
                <tbody>
                  {outsourcingRows.map((row) => (
                    <tr key={row.company} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 font-medium text-foreground">{row.company}</td>
                      <td className="px-4 py-2">{row.task}</td>
                      <td className="px-4 py-2">{row.data}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="overseas">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제8조 국외 이전</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>
              서비스는 글로벌 클라우드와 분석 도구를 사용하므로 개인정보가 국외로 이전될 수 있습니다.
              회원가입 또는 서비스 이용 과정에서 국외 이전에 동의하지 않을 수 있으나, 이 경우 회원 인증,
              데이터 저장, 결제, 분석 등 일부 기능 이용이 제한될 수 있습니다.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">이전받는 자</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">국가</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">항목</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">목적</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">보유기간</th>
                  </tr>
                </thead>
                <tbody>
                  {overseasRows.map((row) => (
                    <tr key={row.recipient} className="border-b border-border last:border-b-0">
                      <td className="px-4 py-2 font-medium text-foreground">{row.recipient}</td>
                      <td className="px-4 py-2">{row.country}</td>
                      <td className="px-4 py-2">{row.items}</td>
                      <td className="px-4 py-2">{row.purpose}</td>
                      <td className="px-4 py-2">{row.period}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="destruction">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제9조 파기 절차와 방법</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>수집·이용 목적이 달성되거나 보유기간이 종료된 개인정보는 지체 없이 파기합니다.</li>
            <li>법령상 보관이 필요한 정보는 별도 데이터베이스 또는 별도 권한 영역에 분리 보관합니다.</li>
            <li>전자 파일은 복구하기 어렵도록 삭제하며, 종이 문서는 분쇄 또는 소각 방식으로 파기합니다.</li>
            <li>백업 또는 로그에 포함된 정보는 보관 주기와 기술적 특성에 따라 순차적으로 삭제됩니다.</li>
          </ol>
        </section>

        <section id="rights">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제10조 정보주체의 권리</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              이용자는 언제든지 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회, 회원 탈퇴를 요구할 수
              있습니다. 마케팅 수신 동의는 서비스 설정 또는 문의를 통해 철회할 수 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>권리 행사는 이메일 또는 서비스 내 문의 기능을 통해 요청할 수 있습니다.</li>
              <li>회사는 본인 확인 후 법령에서 정한 기간 안에 조치하고 처리 결과를 안내합니다.</li>
              <li>법령상 보관 의무, 분쟁 대응, 부정이용 방지 목적이 있는 경우 삭제 또는 처리정지가 제한될 수 있습니다.</li>
              <li>대리인이 요청하는 경우 위임장 등 적법한 대리권 확인 자료를 요청할 수 있습니다.</li>
            </ol>
          </div>
        </section>

        <section id="cookies">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제11조 쿠키와 행태정보</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              회사는 로그인 유지, 세션 보안, 장바구니·쿠폰·주문서 입력 상태 유지, 중복 팝업 방지,
              서비스 통계 분석을 위해 쿠키와 브라우저 저장소를 사용할 수 있습니다.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>필수 쿠키: Supabase 인증 세션, 30분 미사용 로그아웃을 위한 마지막 활동 정보</li>
              <li>기능 저장소: 장바구니, 쿠폰, 세금계산서 입력값, 모닝브리프 또는 팝업 표시 상태</li>
              <li>분석 쿠키: GA4 측정 ID가 설정된 경우 페이지 조회, 상품 조회, 구매, 다운로드, 리뷰 이벤트</li>
            </ol>
            <p>
              이용자는 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있습니다. 다만 필수 쿠키를
              차단하면 로그인, 결제, 다운로드 등 주요 기능이 정상 동작하지 않을 수 있습니다.
            </p>
            <p>
              현재 서비스는 맞춤형 광고를 위한 제3자 행태정보 제공을 목적으로 이용자를 추적하지 않습니다.
            </p>
          </div>
        </section>

        <section id="safety">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제12조 안전성 확보조치</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>비밀번호는 인증 제공자의 안전한 방식으로 암호화 또는 해시 처리됩니다.</li>
            <li>서버사이드 인증, 구매 확인, 권한 검사, 데이터베이스 접근 정책을 통해 무단 접근을 제한합니다.</li>
            <li>5회 로그인 실패 시 15분 잠금, 30분 미사용 세션 만료 등 계정 보호 장치를 운영합니다.</li>
            <li>구매 자료 다운로드는 서버에서 권한을 확인하고 제한된 시간의 서명 URL로 제공합니다.</li>
            <li>채팅, 상담, 결제, 인증 관련 주요 요청에는 속도 제한과 입력값 검증을 적용합니다.</li>
            <li>관리자 권한은 필요한 범위로 제한하며, 접근 로그와 오류 로그를 통해 이상 징후를 점검합니다.</li>
          </ol>
        </section>

        <section id="manager">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제13조 개인정보 보호책임자</h2>
          <div className="border border-border rounded-lg p-4 text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">개인정보 보호책임자</p>
            <ul className="space-y-1 text-sm">
              <li>소속: AMARANS Partners</li>
              <li>책임자: 채호진</li>
              <li>이메일: contact@presales.co.kr</li>
              <li>문의 방법: 서비스 내 문의 또는 채팅 기능</li>
            </ul>
            <p className="mt-3 text-xs">
              개인정보 열람·정정·삭제·처리정지 요청, 동의 철회, 불만 처리, 피해 구제 요청은 위 연락처로
              접수할 수 있습니다.
            </p>
          </div>
        </section>

        <section id="remedy">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제14조 권익침해 구제</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              이용자는 개인정보 침해로 인한 상담, 신고, 분쟁 조정을 위해 아래 기관에 문의할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>개인정보침해신고센터: privacy.kisa.or.kr / 국번 없이 118</li>
              <li>개인정보분쟁조정위원회: www.kopico.go.kr / 1833-6972</li>
              <li>개인정보보호위원회 개인정보보호 포털: www.privacy.go.kr</li>
              <li>경찰청 사이버범죄 신고시스템: ecrm.police.go.kr / 국번 없이 182</li>
            </ul>
          </div>
        </section>

        <section id="changes">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제15조 방침 변경</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>
              회사는 관련 법령, 서비스 기능, 개인정보 처리 방식이 변경되는 경우 본 방침을 개정할 수
              있습니다. 중요한 변경이 있는 경우 시행 전 서비스 화면 또는 이메일 등 적절한 방법으로
              안내합니다.
            </p>
            <p>본 개인정보처리방침은 2026년 4월 27일부터 시행합니다.</p>
          </div>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>시행일: 2026년 4월 27일</p>
          <p className="mt-1">사업자: AMARANS Partners | 대표자: 채호진 | 문의: contact@presales.co.kr</p>
        </div>
      </div>
    </div>
  )
}
