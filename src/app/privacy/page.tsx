import { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL } from '@/lib/constants'

export const metadata: Metadata = {
  title: '개인정보처리방침 | PRESALES by AMARANS Partners',
  description: 'PRESALES 개인정보처리방침 — 개인정보보호법 기반 방침 전문',
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
}

const sections = [
  { id: 'collected', title: '제1조 (수집하는 개인정보)' },
  { id: 'purpose', title: '제2조 (수집 및 이용 목적)' },
  { id: 'retention', title: '제3조 (보유 및 이용 기간)' },
  { id: 'third-party', title: '제4조 (제3자 제공)' },
  { id: 'destruction', title: '제5조 (개인정보 파기)' },
  { id: 'rights', title: '제6조 (이용자의 권리)' },
  { id: 'cookies', title: '제7조 (쿠키 사용)' },
  { id: 'manager', title: '제8조 (개인정보 보호책임자)' },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-8 py-16 md:py-20">
      <div className="mb-12">
        <p className="text-xs font-semibold text-primary uppercase tracking-widest mb-3">PRIVACY POLICY</p>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">개인정보처리방침</h1>
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
        <p className="text-muted-foreground">
          AMARANS Partners(이하 "회사")는 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
        </p>

        {/* 제1조 */}
        <section id="collected">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제1조 (수집하는 개인정보)</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수집 시점</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수집 항목</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수집 방법</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">회원 가입 시</td>
                    <td className="px-4 py-2">이메일 주소, 이름, 비밀번호(암호화)</td>
                    <td className="px-4 py-2">Supabase Auth (직접 입력)</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">프로필 설정 시</td>
                    <td className="px-4 py-2">회사명</td>
                    <td className="px-4 py-2">서비스 내 직접 입력</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">서비스 이용 시</td>
                    <td className="px-4 py-2">접속 IP, 접속 로그, 서비스 이용 기록</td>
                    <td className="px-4 py-2">자동 수집</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-xs">
              * 결제 정보(카드번호 등)는 PG사(토스페이먼츠)를 통해 처리되며, 회사는 결제 정보를 직접 저장하지 않습니다.
            </p>
          </div>
        </section>

        {/* 제2조 */}
        <section id="purpose">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제2조 (수집 및 이용 목적)</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li><span className="text-foreground font-medium">서비스 제공:</span> 회원 인증, 콘텐츠 다운로드, 구매 내역 관리</li>
            <li><span className="text-foreground font-medium">주문 처리:</span> 결제 확인, 영수증 발행, 문의 대응</li>
            <li><span className="text-foreground font-medium">마케팅 및 광고:</span> 신상품 안내, 프로모션 정보 발송 (별도 동의 시)</li>
            <li><span className="text-foreground font-medium">서비스 개선:</span> 서비스 이용 통계 분석, 기능 개선</li>
            <li><span className="text-foreground font-medium">법적 의무:</span> 관련 법령에 따른 의무 이행 및 분쟁 해결</li>
          </ol>
        </section>

        {/* 제3조 */}
        <section id="retention">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제3조 (보유 및 이용 기간)</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시 동의 받은 기간 내에서 개인정보를 보유·이용합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">항목</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">보유 기간</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">근거</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">회원 정보</td>
                    <td className="px-4 py-2">회원 탈퇴 시까지</td>
                    <td className="px-4 py-2">이용자 동의</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">거래 기록</td>
                    <td className="px-4 py-2">5년</td>
                    <td className="px-4 py-2">전자상거래법 제6조</td>
                  </tr>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">소비자 불만/분쟁 기록</td>
                    <td className="px-4 py-2">3년</td>
                    <td className="px-4 py-2">전자상거래법 제6조</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">접속 로그</td>
                    <td className="px-4 py-2">3개월</td>
                    <td className="px-4 py-2">통신비밀보호법 제41조</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 제4조 */}
        <section id="third-party">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제4조 (제3자 제공)</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 단, 다음의 경우는 예외로 합니다.</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나 수사·조사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관이 요구하는 경우</li>
            </ol>
            <p>서비스 운영을 위해 다음 업체에 개인정보 처리를 위탁합니다.</p>
            <div className="overflow-x-auto">
              <table className="w-full border border-border rounded-lg text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">수탁 업체</th>
                    <th className="px-4 py-2 text-left font-semibold border-b border-border">위탁 업무</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border">
                    <td className="px-4 py-2">Supabase Inc.</td>
                    <td className="px-4 py-2">회원 인증 및 데이터 저장</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2">토스페이먼츠(주)</td>
                    <td className="px-4 py-2">결제 처리</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 제5조 */}
        <section id="destruction">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제5조 (개인정보 파기)</h2>
          <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
            <li>회원 탈퇴 시 보유 기간이 경과된 개인정보는 지체 없이 파기합니다.</li>
            <li>전자적 파일 형태의 정보는 복구 불가능한 방법으로 영구 삭제합니다.</li>
            <li>종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각합니다.</li>
          </ol>
        </section>

        {/* 제6조 */}
        <section id="rights">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제6조 (이용자의 권리)</h2>
          <div className="space-y-3 text-muted-foreground">
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <ol className="list-decimal list-inside space-y-2">
              <li>개인정보 열람 요구</li>
              <li>오류 정정 요구</li>
              <li>삭제 요구 (단, 법령상 의무로 보관하는 경우 제외)</li>
              <li>처리 정지 요구</li>
            </ol>
            <p>권리 행사는 이메일(contact@presales.co.kr)로 요청하시면 영업일 기준 10일 이내 처리합니다.</p>
          </div>
        </section>

        {/* 제7조 */}
        <section id="cookies">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제7조 (쿠키 사용)</h2>
          <div className="space-y-3 text-muted-foreground">
            <ol className="list-decimal list-inside space-y-2">
              <li>회사는 로그인 상태 유지, 서비스 개선 목적으로 쿠키(Cookie)를 사용합니다.</li>
              <li>이용자는 브라우저 설정에서 쿠키를 거부할 수 있으나, 이 경우 일부 서비스 이용이 제한될 수 있습니다.</li>
              <li>쿠키 거부 방법: 브라우저 설정 → 개인정보 보호 → 쿠키 차단</li>
            </ol>
          </div>
        </section>

        {/* 제8조 */}
        <section id="manager">
          <h2 className="text-base font-bold mb-3 border-b border-border pb-2">제8조 (개인정보 보호책임자)</h2>
          <div className="border border-border rounded-lg p-4 text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">개인정보 보호책임자</p>
            <ul className="space-y-1 text-sm">
              <li>성명: 채호진</li>
              <li>직책: 대표</li>
              <li>이메일: contact@presales.co.kr</li>
              <li>전화: 서비스 내 문의하기 기능 이용</li>
            </ul>
            <p className="mt-3 text-xs">
              개인정보 처리에 관한 불만 처리, 피해구제 등을 위한 기관:
              <br />개인정보분쟁조정위원회(www.kopico.go.kr) | 개인정보침해신고센터(privacy.kisa.or.kr)
            </p>
          </div>
        </section>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground">
          <p>본 방침은 2026년 4월 7일부터 시행됩니다.</p>
          <p className="mt-1">사업자: AMARANS Partners | 대표자: 채호진</p>
        </div>
      </div>
    </div>
  )
}
