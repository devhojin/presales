type BusinessInfoCell = {
  label: string
  value: string
  colspan?: number
}

const BUSINESS_ROWS: BusinessInfoCell[][] = [
  [
    { label: '통신판매번호', value: '2023-수원권선-0773' },
    { label: '사업자등록번호', value: '682-53-00808' },
  ],
  [
    { label: '운영상태', value: '통신판매업신고' },
    { label: '법인여부', value: '개인' },
  ],
  [
    { label: '상호', value: '아마란스', colspan: 3 },
  ],
  [
    { label: '대표자명', value: '채호진' },
    { label: '대표 전화번호', value: '010-3124-****' },
  ],
  [
    { label: '판매방식', value: '인터넷' },
    { label: '취급품목', value: '기타' },
  ],
  [
    { label: '전자우편(E-mail)', value: 'hoj******@gmail.com' },
    { label: '신고일자', value: '20230410' },
  ],
  [
    { label: '사업장소재지', value: '경기도 수원시 권선구 금곡동 ****', colspan: 3 },
  ],
  [
    {
      label: '사업장소재지(도로명)',
      value: '경기도 수원시 권선구 금곡로***번길 **-**, 이노인큐 수원창업보육센터 내 *층 ***-**호 (금곡동)',
      colspan: 3,
    },
  ],
  [
    { label: '인터넷도메인', value: 'www.presales.co.kr', colspan: 3 },
  ],
  [
    { label: '호스트서버소재지', value: '서울특별시 강남구 논현로 508, GS강남타워 12층 (역삼동)', colspan: 3 },
  ],
  [
    { label: '통신판매업 신고기관명', value: '경기도 수원시 권선구', colspan: 3 },
  ],
]

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const tableRows = BUSINESS_ROWS.map((row) => {
  const cells = row
    .map((cell) => {
      const colSpan = cell.colspan ? ` colspan="${cell.colspan}"` : ''
      return `<th>${escapeHtml(cell.label)}</th><td${colSpan}>${escapeHtml(cell.value)}</td>`
    })
    .join('')
  return `<tr>${cells}</tr>`
}).join('')

const html = `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>통신판매 사업자정보 조회</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; min-height: 100%; background: #fff; color: #1f2933; font-family: -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif; }
    body { padding: 0 0 48px; }
    .wrap { width: 100%; margin: 0 auto; }
    h1 { margin: 0; padding: 18px 22px; border-bottom: 1px solid #d5dce3; font-size: 20px; font-weight: 800; color: #111827; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border-top: 1px solid #d5dce3; }
    th, td { border-bottom: 1px solid #d5dce3; padding: 18px 20px; font-size: 20px; line-height: 1.35; vertical-align: middle; word-break: keep-all; overflow-wrap: anywhere; }
    th { width: 210px; background: #e8edf2; color: #111827; text-align: left; font-weight: 800; }
    td { color: #4a4f55; font-weight: 500; }
    .notice { margin: 28px 0 0; padding: 0 0 0; border-top: 1px solid #d5dce3; }
    .notice-box { margin: 26px auto 0; width: calc(100% - 32px); border: 1px solid #c9ced6; border-radius: 10px; padding: 30px 34px; color: #14171a; font-size: 18px; line-height: 1.72; }
    .notice-box p { margin: 0; }
    .notice-box p + p { margin-top: 26px; }
    .notice-box a { color: #2563eb; text-decoration: none; font-weight: 700; }
    .notice-box strong { font-weight: 800; }
    .external-icon { display: inline-block; width: 16px; height: 16px; margin-left: 3px; vertical-align: -2px; border: 2px solid currentColor; border-radius: 2px; position: relative; }
    .external-icon::after { content: ""; position: absolute; right: -5px; top: -5px; width: 8px; height: 8px; border-top: 2px solid currentColor; border-right: 2px solid currentColor; }
    .external-icon::before { content: ""; position: absolute; right: -4px; top: -1px; width: 10px; height: 2px; background: currentColor; transform: rotate(-45deg); transform-origin: right center; }
    @media (max-width: 720px) {
      h1 { font-size: 18px; padding: 16px; }
      table, tbody, tr, th, td { display: block; width: 100%; }
      tr { border-bottom: 1px solid #d5dce3; }
      th, td { border-bottom: 0; padding: 12px 16px; font-size: 16px; }
      th { width: 100%; }
      td { padding-top: 0; }
      .notice-box { width: calc(100% - 20px); padding: 22px 20px; font-size: 15px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <h1>통신판매 사업자정보 조회</h1>
    <table aria-label="통신판매 사업자정보">
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <section class="notice" aria-label="사업자 정보 안내">
      <div class="notice-box">
        <p>
          본자료는 전자상거래시장에서 소비자가 정확한 사업자 정보를 가지고 안전한 거래를 할 수 있도록
          전국 시,군,구에 신고된 <strong>통신판매업자의</strong> 신원정보를
          <a href="https://www.ftc.go.kr" target="_blank" rel="noopener noreferrer">전자상거래소비자보호법 제12조4항</a>에 따라 제공하는 정보입니다.
          사업자 정보에 대한 궁금한 사항이나 사업자의 신원정보가 정보공개 내용과 불일치할 경우에는 사업자 정보검색시 확인되는
          해당 <strong>신고기관(지방자치단체)</strong>에 문의하여 주시기 바랍니다.
        </p>
        <p>
          일부 사업자의 경우, 부가가치세법상 사업자 폐업 신고는 하였으나 전자상거래법상 통신판매업 폐업 신고는 하지 않은 사례가 있을 수 있습니다.
          소비자 피해를 방지하기 위해 부가가치세법상 <strong>사업자 폐업 여부도 국세청 홈택스 페이지(www.hometax.go.kr)</strong>의
          사업자등록상태조회 코너를 통해 확인하시기 바랍니다.
          <a href="https://www.hometax.go.kr" target="_blank" rel="noopener noreferrer">바로가기 <span class="external-icon" aria-hidden="true"></span></a>
        </p>
      </div>
    </section>
  </main>
</body>
</html>`

export function GET() {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  })
}
