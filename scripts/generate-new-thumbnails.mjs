import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

// DB product_id 46~59 — 신규 등록 상품
const products = [
  { id: 46, title: 'SLA 서비스\n품질관리 제안서', format: 'PPTX', category: 'IT운영', color: '#334155', icon: '📈', price: '49,000' },
  { id: 47, title: 'LMS 학습관리\n시스템 분석설계서', format: 'PPTX', category: '에듀테크', color: '#7c3aed', icon: '🎓', price: '58,900' },
  { id: 48, title: 'MOU 양해각서\n양식 템플릿', format: 'DOC', category: '계약/협약', color: '#0369a1', icon: '🤝', free: true },
  { id: 49, title: '프로젝트\n수행계획서', format: 'DOCX', category: '프로젝트관리', color: '#475569', icon: '📋', free: true },
  { id: 50, title: '엔티티 정의서\nDB 설계 문서', format: 'ZIP', category: '데이터베이스', color: '#7c3aed', icon: '🗄️', free: true },
  { id: 51, title: '우선협상대상자\n기술협상안', format: 'HWP', category: '공공입찰', color: '#0c4a6e', icon: '🏛️', free: true },
  { id: 52, title: '제안서 목차\n참조 템플릿', format: 'XLS', category: '입찰가이드', color: '#047857', icon: '📑', free: true },
  { id: 53, title: '제안서 목차\n템플릿 2024', format: 'XLSX', category: '입찰가이드', color: '#059669', icon: '📑', free: true },
  { id: 54, title: '투찰가 산정\n지분율 계산기', format: 'XLSX', category: '가격제안', color: '#b45309', icon: '🧮', free: true },
  { id: 55, title: '특허청 SW\n개발방법론', format: 'PDF', category: '개발방법론', color: '#1e3a5f', icon: '⚙️', free: true },
  { id: 56, title: '프로그램 목록\n템플릿', format: 'XLSX', category: '프로젝트관리', color: '#0284c7', icon: '📝', free: true },
  { id: 57, title: 'IA 정보구조\n기획서 템플릿', format: 'XLSX', category: '설계문서', color: '#be185d', icon: '🗺️', free: true },
  { id: 58, title: '상품이력제\n정보시스템 구축', format: 'PPTX+PDF', category: '유통/추적', color: '#0f766e', icon: '🏭', price: '99,000' },
  { id: 59, title: '공공정보화\n제안요청서 가이드', format: 'ZIP', category: '입찰가이드', color: '#1d4ed8', icon: '📖', free: true },
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

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:750px; height:750px; display:flex; align-items:center; justify-content:center; background:${p.color}; font-family:-apple-system,'Malgun Gothic',sans-serif; overflow:hidden; }
    .card { width:750px; height:750px; position:relative; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:60px; text-align:center; }
    .pattern { position:absolute; top:0; left:0; right:0; bottom:0; background:radial-gradient(circle at 20% 80%, rgba(255,255,255,0.05) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.08) 0%, transparent 50%); }
    .icon { font-size:72px; margin-bottom:24px; position:relative; z-index:1; }
    .category { display:inline-block; background:rgba(255,255,255,0.15); color:rgba(255,255,255,0.9); font-size:13px; font-weight:600; padding:6px 16px; border-radius:20px; margin-bottom:20px; position:relative; z-index:1; letter-spacing:0.5px; }
    .title { color:#fff; font-size:36px; font-weight:800; line-height:1.3; margin-bottom:24px; position:relative; z-index:1; white-space:pre-line; text-shadow:0 2px 4px rgba(0,0,0,0.2); }
    .formats { margin-bottom:20px; position:relative; z-index:1; }
    .brand { position:absolute; bottom:30px; left:0; right:0; text-align:center; z-index:1; }
    .brand-text { color:rgba(255,255,255,0.4); font-size:13px; font-weight:600; letter-spacing:2px; }
  </style></head><body>
  <div class="card">
    <div class="pattern"></div>
    <div class="icon">${p.icon}</div>
    <div class="category">${p.category}</div>
    <div class="title">${p.title}</div>
    <div class="formats">${formatBadges}</div>
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
    console.log(`✅ product-${p.id}.png — ${p.title.replace('\n', ' ')}`)
  }

  await browser.close()
  console.log(`\n완료! ${products.length}개 썸네일 생성됨`)
}

main().catch(console.error)
