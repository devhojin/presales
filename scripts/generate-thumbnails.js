/**
 * Thumbnail Generator — Presales Design System v2.0
 * Full-bleed dark design, no margins, emerald/zinc palette
 * Uses sharp (SVG → PNG)
 * Usage: node scripts/generate-thumbnails.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const products = [
  { id: "2", title: "3개년 수주 ARPU", fileTypes: "XLS", isFree: true, cat: "사업계획서" },
  { id: "3", title: "IoT 서버 시스템 디바이스 연동 시나리오", fileTypes: "PPT", isFree: true, cat: "기술제안서" },
  { id: "4", title: "WBS PPT 템플릿", fileTypes: "PPT", isFree: true, cat: "발표자료" },
  { id: "5", title: "개인정보보호법 적용사례 시나리오 100건", fileTypes: "PDF", isFree: true, cat: "입찰가이드" },
  { id: "7", title: "기능 및 기술요건 정의서", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "8", title: "대형쇼핑몰 서비스정책서", fileTypes: "PDF,DOC", isFree: true, cat: "기술제안서" },
  { id: "9", title: "데이터전환 계획서", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "10", title: "디바이스 배포 프로세스", fileTypes: "PPT", isFree: true, cat: "기술제안서" },
  { id: "11", title: "PMO 문서관리지침서", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "12", title: "프로젝트 변경요청서 템플릿", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "13", title: "설계문서 ERD", fileTypes: "PPT", isFree: true, cat: "기술제안서" },
  { id: "14", title: "요구사항 추적표", fileTypes: "XLS", isFree: true, cat: "기술제안서" },
  { id: "16", title: "프로젝트 산출물 템플릿 세트", fileTypes: "XLS,DOC,ZIP", isFree: true, cat: "풀 패키지" },
  { id: "17", title: "프로젝트 평가서", fileTypes: "XLS", isFree: true, cat: "기술제안서" },
  { id: "19", title: "나라장터 입찰 제안서 시스템 구축부문 (30억 규모)", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "20", title: "안전플랫폼 관제 시스템 MMI", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "23", title: "국내 Top tier 쇼핑몰 BM 개선 및 차세대 제안서", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "24", title: "IoT 서버 시스템 디바이스 연동 시나리오 (유료버전)", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "25", title: "금융 시스템 유지운영 제안서 (월 1억 매출)", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "27", title: "군부대 IoT 시설물 원격감시체계 구축 제안서", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "28", title: "대형쇼핑몰 서비스정책서 통합본 (유료버전)", fileTypes: "PDF,DOC", isFree: false, cat: "기술제안서" },
  { id: "29", title: "정부 지자체 홈페이지 통합 유지보수 및 고도화", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "30", title: "청해시 홈페이지 통합 유지보수 및 고도화 제안서", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "31", title: "UI/UX 기획서", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "32", title: "악성코드 은닉사이트 조치 및 기술지원 용역", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "33", title: "사업비 세부내역 산출 (비목 산출표)", fileTypes: "ZIP", isFree: false, cat: "가격제안" },
  { id: "34", title: "광고플랫폼 스토리보드", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "35", title: "산업활용 디자인DB 구축 (박물관 제안서)", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "36", title: "네트워크 보안 인력 양성 교육 플랫폼 개발 운영 제안서", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "37", title: "정보보안 업무관리 시스템 구축 (27억 규모)", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "38", title: "농산물 물류 추적 및 관리 시스템 구축 용역", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "39", title: "화영시 여객서비스 입주기업 지원 포털사이트 제안서", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "40", title: "[A3] 45억 규모 공공 제안서 시스템 구축부문", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "41", title: "[세로/A4] 45억 규모 공공 제안서 시스템 구축부문", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "43", title: "ISP 통합전산망 구축 정보화 전략계획", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "44", title: "나라장터 제안서 작성법", fileTypes: "PPT,PDF", isFree: false, cat: "입찰가이드" },
  { id: "45", title: "예비창업패키지 사업계획서", fileTypes: "PPT,PDF,HWP", isFree: false, cat: "사업계획서" },
  { id: "46", title: "SLA 서비스품질관리 부문 제안서", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "47", title: "LMS 학습관리시스템 분석설계서", fileTypes: "PPT", isFree: false, cat: "기술제안서" },
  { id: "48", title: "MOU(양해각서) 양식 템플릿", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "49", title: "프로젝트 수행계획서 템플릿", fileTypes: "DOC", isFree: true, cat: "기술제안서" },
  { id: "50", title: "엔티티 정의서 (DB 설계 문서)", fileTypes: "ZIP", isFree: true, cat: "기술제안서" },
  { id: "51", title: "우선협상대상자 기술협상안", fileTypes: "HWP", isFree: true, cat: "기술제안서" },
  { id: "52", title: "제안서 목차 참조 템플릿", fileTypes: "XLS", isFree: true, cat: "입찰가이드" },
  { id: "53", title: "제안서 목차 템플릿 (2024)", fileTypes: "XLS", isFree: true, cat: "입찰가이드" },
  { id: "54", title: "투찰가 산정 및 지분율 계산기", fileTypes: "XLS", isFree: true, cat: "가격제안" },
  { id: "55", title: "특허청 소프트웨어(SW) 개발방법론", fileTypes: "PDF", isFree: true, cat: "입찰가이드" },
  { id: "56", title: "프로그램 목록 템플릿", fileTypes: "XLS", isFree: true, cat: "기술제안서" },
  { id: "57", title: "IA(정보구조) 기획서 템플릿", fileTypes: "XLS", isFree: true, cat: "기술제안서" },
  { id: "58", title: "상품이력제 정보시스템 구축 용역 제안서", fileTypes: "PPT,PDF", isFree: false, cat: "기술제안서" },
  { id: "59", title: "공공정보화 제안요청서 가이드 (2024)", fileTypes: "ZIP", isFree: true, cat: "입찰가이드" },
];

const FT_COLORS = {
  PPT: '#EA580C', PDF: '#DC2626', XLS: '#16A34A',
  DOC: '#2563EB', HWP: '#0EA5E9', ZIP: '#52525B',
};

function getGradientStops(id, isFree) {
  const n = parseInt(id);
  if (isFree) {
    const opts = [
      ['#18181B', '#27272A'], ['#1E293B', '#334155'], ['#1C1917', '#292524'],
      ['#1a1a2e', '#16213e'], ['#0f0f23', '#1a1a2e'],
    ];
    return opts[n % opts.length];
  }
  const opts = [
    ['#0C1220', '#064E3B'], ['#0C1220', '#312E81'], ['#0C1220', '#0F766E'],
    ['#0C1220', '#78350F'], ['#0C1220', '#0E7490'], ['#0C1220', '#4C1D95'],
    ['#0C1220', '#065F46'], ['#0C1220', '#1E3A5F'],
  ];
  return opts[n % opts.length];
}

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Word-wrap title into lines
function wrapTitle(title, maxChars) {
  if (title.length <= maxChars) return [title];
  const words = title.split(/\s+/);
  const lines = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxChars) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3); // max 3 lines
}

function generateSVG(product) {
  const [c1, c2] = getGradientStops(product.id, product.isFree);
  const fileTypes = product.fileTypes.split(',').filter(Boolean);
  const lines = wrapTitle(product.title, 16);
  const fontSize = lines.length > 2 ? 38 : lines.some(l => l.length > 10) ? 40 : 46;
  const lineHeight = fontSize * 1.3;
  const accentColor = product.isFree ? '#71717A' : '#34D399';

  // Calculate total content block height for vertical centering
  const badgeH = 28;
  const badgeGap = 14;
  const catH = 14;
  const catGap = 14;
  const titleBlockH = lines.length * lineHeight;
  const ftGap = fileTypes.length > 0 ? 20 : 0;
  const ftH = fileTypes.length > 0 ? 26 : 0;
  const totalH = badgeH + badgeGap + catH + catGap + titleBlockH + ftGap + ftH;
  // Center within area below brand (top 80px reserved for brand)
  const availableTop = 80;
  const startY = availableTop + (600 - availableTop - totalH) / 2;

  const badgeY = startY;
  const catY = badgeY + badgeH + badgeGap;
  const titleStartY = catY + catH + catGap;
  const ftY = titleStartY + titleBlockH + ftGap;

  // File type badges
  let ftBadges = '';
  let ftX = 52;
  fileTypes.forEach(ft => {
    const color = FT_COLORS[ft] || '#52525B';
    ftBadges += `<rect x="${ftX}" y="${ftY}" width="${ft.length * 12 + 20}" height="26" rx="6" fill="${color}"/>`;
    ftBadges += `<text x="${ftX + ft.length * 6 + 10}" y="${ftY + 18}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="system-ui,sans-serif" letter-spacing="0.5">${ft}</text>`;
    ftX += ft.length * 12 + 28;
  });

  return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.3" r="0.6">
      <stop offset="0%" stop-color="${product.isFree ? 'rgba(255,255,255,0.03)' : 'rgba(52,211,153,0.06)'}"/>
      <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#glow)"/>

  <!-- Accent line top-right -->
  <rect x="700" y="40" width="52" height="3" rx="1.5" fill="${accentColor}" opacity="0.6"/>

  <!-- Brand -->
  <rect x="52" y="38" width="28" height="28" rx="7" fill="${product.isFree ? '#52525B' : '#059669'}"/>
  <text x="66" y="57" text-anchor="middle" font-size="10" font-weight="800" fill="#fff" font-family="system-ui,sans-serif">PS</text>
  <text x="90" y="57" font-size="13" font-weight="700" fill="rgba(255,255,255,0.4)" font-family="system-ui,sans-serif" letter-spacing="0.5">PRESALES</text>

  <!-- Badge (FREE / PREMIUM) -->
  <rect x="52" y="${badgeY}" width="${product.isFree ? 62 : 95}" height="28" rx="14" fill="${product.isFree ? 'rgba(255,255,255,0.08)' : 'rgba(52,211,153,0.12)'}" stroke="${product.isFree ? 'rgba(255,255,255,0.06)' : 'rgba(52,211,153,0.2)'}" stroke-width="1"/>
  <text x="${product.isFree ? 83 : 99.5}" y="${badgeY + 19}" text-anchor="middle" font-size="10" font-weight="700" fill="${product.isFree ? '#A1A1AA' : '#34D399'}" font-family="system-ui,sans-serif" letter-spacing="1.5">${product.isFree ? 'FREE' : 'PREMIUM'}</text>

  <!-- Category -->
  <text x="52" y="${catY + 12}" font-size="12" font-weight="600" fill="rgba(255,255,255,0.35)" font-family="system-ui,sans-serif" letter-spacing="2">${escapeXml(product.cat.toUpperCase())}</text>

  <!-- Title -->
  ${lines.map((line, i) => `<text x="52" y="${titleStartY + i * lineHeight + fontSize * 0.85}" font-size="${fontSize}" font-weight="800" fill="#FAFAFA" font-family="system-ui,sans-serif" letter-spacing="-0.5">${escapeXml(line)}</text>`).join('\n  ')}

  <!-- File type badges -->
  ${ftBadges}
</svg>`;
}

async function main() {
  const outDir = path.join(__dirname, '..', 'public', 'thumbnails');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log(`Generating ${products.length} thumbnails...`);

  for (const product of products) {
    const svg = generateSVG(product);
    const outPath = path.join(outDir, `product-${product.id}.png`);
    await sharp(Buffer.from(svg)).png().toFile(outPath);
    console.log(`  [${product.id}] ${product.title.substring(0, 40)}`);
  }

  console.log(`\nDone! ${products.length} thumbnails generated.`);
}

main().catch(console.error);
