import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

const products = [
  { id: 1, title: '프로젝트 산출물 목록', format: 'XLSX', category: '프로젝트관리', color: '#1e40af', icon: '📋', free: true },
  { id: 2, title: '3개년 수주 ARPU\n매출 산정', format: 'XLSX', category: '사업계획서', color: '#059669', icon: '📊', free: true },
  { id: 3, title: 'WBS 작업분류체계\nPPT 템플릿', format: 'PPTX', category: '프로젝트관리', color: '#c2410c', icon: '📅', free: true },
  { id: 4, title: '개인정보보호법\n적용사례 100건', format: 'PDF', category: '보안/컴플라이언스', color: '#7c3aed', icon: '🔒', free: true },
  { id: 5, title: '건설현장\n공종 분류 체계', format: 'XLSX', category: '건설/시설', color: '#b45309', icon: '🏗️', free: true },
  { id: 6, title: '기능 및 기술요건\n정의서 템플릿', format: 'DOCX', category: '시스템구축', color: '#0369a1', icon: '⚙️', free: true },
  { id: 7, title: '대형쇼핑몰\n서비스정책서', format: 'DOCX+PDF', category: '이커머스', color: '#be185d', icon: '🛒', free: true },
  { id: 8, title: '데이터전환\n계획서 템플릿', format: 'DOC', category: '시스템구축', color: '#0e7490', icon: '🔄', free: true },
  { id: 9, title: 'IoT 디바이스\n배포 프로세스', format: 'PPTX', category: 'IoT', color: '#4f46e5', icon: '📡', free: true },
  { id: 10, title: 'PMO 문서관리\n지침서', format: 'DOC', category: '프로젝트관리', color: '#1d4ed8', icon: '📁', free: true },
  { id: 11, title: '프로젝트\n변경요청서', format: 'DOCX', category: '프로젝트관리', color: '#475569', icon: '📝', free: true },
  { id: 12, title: '설계문서 ERD\nPPT 템플릿', format: 'PPT', category: '데이터베이스', color: '#7c3aed', icon: '🗄️', free: true },
  { id: 13, title: '요구사항 추적\n매트릭스', format: 'XLS', category: '품질관리', color: '#047857', icon: '✅', free: true },
  { id: 14, title: '통합테스트\n시나리오 및 결과서', format: 'XLS', category: '품질관리', color: '#dc2626', icon: '🧪', free: true },
  { id: 15, title: '프로젝트 산출물\n템플릿 번들 10종', format: 'ZIP', category: '프로젝트관리', color: '#6d28d9', icon: '📦', free: true },
  { id: 16, title: '프로젝트\n평가서', format: 'XLSX', category: '프로젝트관리', color: '#0284c7', icon: '⭐', free: true },
  { id: 17, title: '[A3] 45억 규모\n공공 제안서', format: 'PPTX+PDF', category: '시스템 구축', color: '#0f172a', icon: '🏛️', price: '199,000' },
  { id: 18, title: 'ISP 통합전산망\n정보화 전략계획', format: 'PPTX+PDF', category: 'ISP/컨설팅', color: '#1e3a5f', icon: '🌐', price: '199,000' },
  { id: 19, title: 'IoT 서버시스템\n디바이스 연동', format: 'PPTX', category: 'IoT', color: '#4338ca', icon: '📡', price: '49,000' },
  { id: 20, title: 'UI/UX 기획서\n온라인 채널', format: 'PPTX', category: 'UI/UX', color: '#be185d', icon: '🎨', price: '69,000' },
  { id: 21, title: '건설현장 공종\n분류체계 프리미엄', format: 'XLSX', category: '건설/시설', color: '#92400e', icon: '🏗️', price: '49,000' },
  { id: 22, title: '광고플랫폼\n스토리보드 2종', format: 'PPTX×2', category: '광고/마케팅', color: '#9333ea', icon: '📺', price: '59,000' },
  { id: 23, title: '네트워크 보안\n교육 플랫폼 제안서', format: 'PPTX+PDF', category: '보안/교육', color: '#991b1b', icon: '🛡️', price: '89,000' },
  { id: 24, title: 'Top tier 쇼핑몰\nBM 개선 제안서', format: 'PPTX+PDF', category: '이커머스', color: '#be185d', icon: '🛒', price: '99,000' },
  { id: 25, title: '군부대 IoT\n원격감시체계 구축', format: 'PPTX+PDF', category: '국방/IoT', color: '#1c1917', icon: '🎖️', price: '149,000' },
  { id: 26, title: '금융 시스템\n유지운영 제안서', format: 'PPTX+PDF', category: '금융', color: '#1e3a5f', icon: '🏦', price: '99,000' },
  { id: 27, title: '나라장터 입찰\n제안서 30억 규모', format: 'PPTX+PDF', category: '공공입찰', color: '#0c4a6e', icon: '🏛️', price: '99,000' },
  { id: 28, title: '나라장터\n제안서 작성법', format: 'PPTX+PDF', category: '가이드', color: '#0369a1', icon: '📖', price: '69,000' },
  { id: 29, title: '노션 영업기회\n관리 PMBOOK', format: 'DOCX', category: '영업/CRM', color: '#1e1e1e', icon: '💼', price: '35,000' },
  { id: 30, title: '농산물 물류 추적\n관리 시스템 구축', format: 'PPTX', category: '물류/유통', color: '#166534', icon: '🚛', price: '99,000' },
  { id: 31, title: '대형쇼핑몰\n서비스정책서 프리미엄', format: 'DOCX+PDF', category: '이커머스', color: '#9f1239', icon: '🛒', price: '49,000' },
  { id: 32, title: '사업비 세부내역\n비목 산출표', format: 'ZIP', category: '가격제안', color: '#475569', icon: '💰', price: '35,000' },
  { id: 33, title: '산업활용 디자인DB\n박물관 제안서', format: 'PPTX', category: '문화/디자인', color: '#7c2d12', icon: '🏛️', price: '89,000' },
  { id: 34, title: '산출물 템플릿\n프리미엄 번들', format: 'ZIP', category: '프로젝트관리', color: '#6d28d9', icon: '📦', price: '69,000' },
  { id: 35, title: '[A4] 45억 규모\n공공 제안서 세로', format: 'PPTX+PDF', category: '시스템 구축', color: '#0f172a', icon: '🏛️', price: '199,000' },
  { id: 36, title: '스마트빌리지\n확산사업 제안서', format: 'HWP', category: 'IoT/돌봄', color: '#15803d', icon: '🏡', price: '89,000' },
  { id: 37, title: '악성코드 은닉사이트\n조치 기술지원', format: 'PPTX+PDF', category: '사이버보안', color: '#991b1b', icon: '🛡️', price: '129,000' },
  { id: 38, title: '안전플랫폼\n관제 시스템 MMI', format: 'PPTX', category: 'IoT/안전', color: '#c2410c', icon: '🖥️', price: '59,000' },
  { id: 39, title: '예비창업패키지\n사업계획서 AI', format: 'PPTX+HWP', category: '창업/AI', color: '#7c3aed', icon: '🚀', price: '89,000' },
  { id: 40, title: '채용관리 & 경영정보\n시스템 구축', format: 'PPTX+PDF', category: 'HR/MIS', color: '#0e7490', icon: '👥', price: '89,000' },
  { id: 41, title: '정보보안 업무관리\n시스템 27억 규모', format: 'PPTX+PDF', category: '정보보안', color: '#1e1b4b', icon: '🔐', price: '149,000' },
  { id: 42, title: '지자체 홈페이지\n유지보수 및 고도화', format: 'PPTX+PDF', category: '정부/지자체', color: '#1e3a5f', icon: '🏛️', price: '149,000' },
  { id: 43, title: '청해시 홈페이지\n유지보수 고도화', format: 'PPTX×4', category: '정부/지자체', color: '#1e3a5f', icon: '🌊', price: '149,000' },
  { id: 44, title: '화영시 포털사이트\n입주기업 지원', format: 'PPTX×5', category: '정부/지자체', color: '#1e3a5f', icon: '🏢', price: '129,000' },
  { id: 45, title: 'SLA 서비스\n품질관리 가이드', format: 'PPTX', category: 'IT운영', color: '#334155', icon: '📈', price: '59,000' },
  { id: 46, title: '상품이력제\n정보시스템 구축', format: 'PPTX+PDF', category: '유통/추적', color: '#0f766e', icon: '🏭', price: '89,000' },
]

function generateHTML(p) {
  const formatColors = {
    'PPTX': '#c0392b', 'PPT': '#c0392b',
    'PDF': '#e74c3c',
    'XLSX': '#27ae60', 'XLS': '#27ae60',
    'DOCX': '#2980b9', 'DOC': '#2980b9',
    'HWP': '#3498db',
    'ZIP': '#7f8c8d',
  }

  const formats = p.format.split(/[+×,\s]+/).filter(Boolean)
  const formatBadges = formats.map(f => {
    const key = f.replace(/[^A-Z]/gi, '')
    const color = formatColors[key] || '#95a5a6'
    return `<span style="display:inline-block;background:${color};color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;margin-right:4px;">${f}</span>`
  }).join('')

  const priceLabel = p.free
    ? '<span style="color:#10b981;font-size:28px;font-weight:800;">무료</span>'
    : `<span style="color:#fff;font-size:28px;font-weight:800;">${p.price}<span style="font-size:14px;font-weight:400;opacity:0.7;">원</span></span>`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:750px; height:750px; display:flex; align-items:center; justify-content:center; background:${p.color}; font-family:-apple-system,'Malgun Gothic',sans-serif; overflow:hidden; }
    .card { width:750px; height:750px; position:relative; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; text-align:center; }
    .pattern { position:absolute; top:0; left:0; right:0; bottom:0; background:radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%); }
    .icon { font-size:72px; margin-bottom:24px; position:relative; z-index:1; }
    .category { display:inline-block; background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.9); font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px; margin-bottom:20px; position:relative; z-index:1; letter-spacing:0.5px; }
    .title { color:#fff; font-size:36px; font-weight:800; line-height:1.3; margin-bottom:24px; position:relative; z-index:1; white-space:pre-line; text-shadow:0 2px 4px rgba(0,0,0,0.2); }
    .formats { margin-bottom:20px; position:relative; z-index:1; }
    .price { position:relative; z-index:1; margin-bottom:16px; }
    .brand { position:absolute; bottom:30px; left:0; right:0; text-align:center; z-index:1; }
    .brand-text { color:rgba(255,255,255,0.4); font-size:13px; font-weight:600; letter-spacing:2px; }
    ${p.free ? '.free-badge { position:absolute; top:30px; right:30px; background:#10b981; color:#fff; font-size:16px; font-weight:800; padding:8px 20px; border-radius:8px; z-index:2; }' : ''}
  </style></head><body>
  <div class="card">
    <div class="pattern"></div>
    ${p.free ? '<div class="free-badge">FREE</div>' : ''}
    <div class="icon">${p.icon}</div>
    <div class="category">${p.category}</div>
    <div class="title">${p.title}</div>
    <div class="formats">${formatBadges}</div>
    <div class="price">${priceLabel}</div>
    <div class="brand"><span class="brand-text">PRESALES DOCUMENTO</span></div>
  </div>
  </body></html>`
}

async function main() {
  const outDir = path.resolve('public/thumbnails')
  fs.mkdirSync(outDir, { recursive: true })

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })

  for (const p of products) {
    const html = generateHTML(p)
    const page = await browser.newPage()
    await page.setViewport({ width: 750, height: 750, deviceScaleFactor: 1 })
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const filePath = path.join(outDir, `product-${p.id}.png`)
    await page.screenshot({ path: filePath, type: 'png' })
    await page.close()
    console.log(`✅ ${p.id}. ${p.title.replace('\n', ' ')}`)
  }

  await browser.close()
  console.log(`\n완료! ${products.length}개 썸네일 생성됨`)
}

main().catch(console.error)
