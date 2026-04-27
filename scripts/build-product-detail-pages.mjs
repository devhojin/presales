import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')

function loadEnv() {
  const envPath = path.join(root, '.env.local')
  if (!fs.existsSync(envPath)) return

  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key] ||= value
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function compactSpaces(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeFileType(type) {
  const upper = String(type).trim().toUpperCase()
  if (upper === 'PPTX') return 'PPT'
  if (upper === 'XLSX') return 'XLS'
  if (upper === 'DOCX') return 'DOC'
  return upper
}

function inferFileTypes(product) {
  const fromField = Array.isArray(product.file_types)
    ? product.file_types
    : product.file_types && Array.isArray(product.file_types.items)
      ? product.file_types.items
      : []

  const values = fromField
    .map(normalizeFileType)
    .filter(Boolean)

  const found = new Set(values)
  const format = String(product.format || '').toUpperCase()
  for (const type of ['PPTX', 'PPT', 'PDF', 'XLSX', 'XLS', 'DOCX', 'DOC', 'HWP', 'ZIP']) {
    if (format.includes(type)) found.add(normalizeFileType(type))
  }
  return Array.from(found)
}

function categoryName(product, categoryMap) {
  const ids = Array.isArray(product.category_ids) && product.category_ids.length > 0
    ? product.category_ids
    : product.category_id
      ? [product.category_id]
      : []
  return ids.map((id) => categoryMap.get(id)).find(Boolean) || '문서'
}

function inferProfile(product, category) {
  const title = product.title
  const lowered = title.toLowerCase()

  const profile = {
    domain: '공공조달 문서',
    artifact: '실무형 문서 템플릿',
    audience: '제안·기획·PM 실무자',
    stage: '입찰 준비와 제출 문서 정리',
    outcome: '문서 작성 시간을 줄이고 평가자가 읽기 쉬운 구조를 확보',
    composition: '표지, 목차, 본문 구성, 작성 가이드, 체크 포인트',
    editFocus: '회사명, 수행 범위, 일정, 인력, 산출물 항목을 자사 상황에 맞게 교체',
  }

  if (title.includes('제안서') || title.includes('나라장터') || title.includes('입찰')) {
    profile.domain = '공공조달 제안'
    profile.artifact = '제안서 작성 템플릿'
    profile.audience = '입찰 제안서 작성자와 사업 PM'
    profile.stage = 'RFP 분석부터 제출본 정리까지'
    profile.outcome = '평가항목에 맞춘 제안 흐름과 설득 구조를 빠르게 확보'
    profile.composition = '사업 이해, 수행 방안, 일정, 조직, 품질·보안, 기대 효과'
  }

  if (title.includes('PDF 버전')) {
    profile.artifact = 'PDF 미리보기형 제안서 자료'
    profile.stage = '구매 전 구조 검토와 제안서 벤치마킹'
    profile.outcome = '원본 구매 전 문서 흐름과 품질 기준을 확인'
    profile.editFocus = 'PDF를 기준으로 필요한 원본 문서 구매 여부를 판단'
  }

  if (title.includes('WBS')) {
    profile.domain = '프로젝트 일정 관리'
    profile.artifact = 'WBS 일정 관리 템플릿'
    profile.audience = 'PM, PMO, 수행사 실무자'
    profile.stage = '착수계획과 주간 진척 관리'
    profile.outcome = '업무분해, 담당자, 일정, 마일스톤을 한 화면에서 정리'
    profile.composition = '작업분해, 일정, 담당자, 진척률, 마일스톤'
  }

  if (title.includes('요구사항') || title.includes('프로그램 목록') || title.includes('엔티티') || title.includes('ERD')) {
    profile.domain = '분석·설계 산출물'
    profile.artifact = '요구사항·설계 관리 문서'
    profile.audience = '기획자, 분석가, 개발 리더'
    profile.stage = '요구사항 정의와 설계 검토'
    profile.outcome = '기능, 데이터, 추적성을 빠르게 정리해 누락을 줄임'
    profile.composition = '정의 항목, 식별자, 상태, 담당, 검토 메모'
  }

  if (title.includes('UI/UX') || title.includes('IA') || title.includes('스토리보드') || title.includes('서비스정책')) {
    profile.domain = '서비스 기획'
    profile.artifact = '기획·정책 문서 템플릿'
    profile.audience = '서비스 기획자, PO, 화면 설계 담당자'
    profile.stage = '화면 구조와 정책 합의'
    profile.outcome = '메뉴 구조, 정책, 화면 흐름을 한 번에 정리'
    profile.composition = '정보구조, 화면 흐름, 정책 표, 운영 기준'
  }

  if (title.includes('IoT') || title.includes('디바이스') || title.includes('시설물') || title.includes('원격감시')) {
    profile.domain = 'IoT·디바이스 연동'
    profile.artifact = '연동 시나리오 및 구축 제안 문서'
    profile.audience = 'IoT 사업 PM, 제안 담당자, 시스템 설계자'
    profile.stage = '장비 연동 범위 정의와 구축 제안'
    profile.outcome = '현장 장비, 서버, 관제 흐름을 평가자가 이해하기 쉽게 구성'
    profile.composition = '장비 구성, 연동 흐름, 데이터 처리, 관제 화면, 운영 방안'
  }

  if (title.includes('보안') || title.includes('악성코드') || title.includes('개인정보')) {
    profile.domain = '보안·개인정보 대응'
    profile.artifact = '보안 제안 및 적용 시나리오'
    profile.audience = '보안 담당자, 제안 PM, 개인정보보호 실무자'
    profile.stage = '보안 요구사항 분석과 대응안 작성'
    profile.outcome = '법·정책·기술 요구를 제안서 언어로 정리'
    profile.composition = '보안 요구사항, 대응 절차, 운영 조직, 점검 항목'
  }

  if (title.includes('홈페이지') || title.includes('포털') || title.includes('쇼핑몰') || lowered.includes('top tier')) {
    profile.domain = '웹서비스 구축·운영'
    profile.artifact = '웹서비스 제안·운영 문서'
    profile.audience = '웹서비스 PM, 운영 담당자, 제안 실무자'
    profile.stage = '서비스 개편, 유지보수, 고도화 제안'
    profile.outcome = '운영 안정성과 개선 계획을 설득력 있게 제시'
    profile.composition = '현황 분석, 개선 방향, 기능 구성, 운영·유지보수, 일정'
  }

  if (title.includes('투찰가') || title.includes('사업비') || title.includes('비목')) {
    profile.domain = '가격제안·산출'
    profile.artifact = '가격 산정 실무 템플릿'
    profile.audience = '영업, 사업관리, 제안 PM'
    profile.stage = '투찰가 검토와 산출 근거 정리'
    profile.outcome = '가격 근거와 지분율을 일관된 방식으로 계산'
    profile.composition = '비목, 산출 근거, 지분율, 합계, 검토 메모'
  }

  if (title.includes('MOU') || title.includes('양해각서')) {
    profile.domain = '협약·계약 준비'
    profile.artifact = 'MOU 문서 양식'
    profile.audience = '사업개발, 영업, 제휴 담당자'
    profile.stage = '협력 범위 합의와 문서화'
    profile.outcome = '협력 목적, 역할, 기간, 비밀유지 조건을 빠르게 정리'
    profile.composition = '목적, 역할, 협력 범위, 기간, 비밀유지, 서명란'
  }

  if (title.includes('SLA')) {
    profile.domain = '서비스 품질 관리'
    profile.artifact = 'SLA 제안 문서'
    profile.audience = '운영 PM, 품질 담당자, 제안 실무자'
    profile.stage = '운영 품질 기준과 대응 체계 정의'
    profile.outcome = '품질지표, 장애 대응, 보고 체계를 명확히 제안'
    profile.composition = '품질지표, 대응 시간, 운영 조직, 보고 체계'
  }

  if (title.includes('사업계획서') || title.includes('예비창업')) {
    profile.domain = '사업계획·창업지원'
    profile.artifact = '사업계획서 작성 템플릿'
    profile.audience = '창업팀, 사업기획자, 지원사업 담당자'
    profile.stage = '지원사업 신청과 사업모델 정리'
    profile.outcome = '문제, 시장, 실행계획, 기대효과를 심사 관점으로 정리'
    profile.composition = '문제 정의, 솔루션, 시장, 실행계획, 팀 역량, 기대효과'
  }

  if (category === '입찰가이드') {
    profile.domain = profile.domain === '공공조달 문서' ? '입찰 가이드' : profile.domain
    profile.artifact = profile.artifact === '실무형 문서 템플릿' ? '입찰 준비 가이드' : profile.artifact
    profile.audience = '입찰 초심자와 제안 실무자'
  }

  if (category === '가격제안') {
    profile.domain = '가격제안·산출'
  }

  return profile
}

function buildDescription(product, profile) {
  return `${product.title}은 ${profile.stage}에 바로 활용할 수 있는 ${profile.artifact}입니다. ${profile.outcome}할 수 있도록 ${profile.composition} 중심으로 구성했습니다.`
}

function buildHtml(product, category, profile, fileTypes) {
  const safeTitle = escapeHtml(product.title)
  const files = fileTypes.length > 0 ? fileTypes.join(', ') : compactSpaces(product.format) || '원본 파일'
  const sourceDescription = compactSpaces(product.description)
  const intro = sourceDescription && sourceDescription.length > 35
    ? sourceDescription
    : buildDescription(product, profile)

  const sections = [
    `<h3>상품 소개</h3>
<p><strong>${safeTitle}</strong>은 ${escapeHtml(profile.stage)}에 바로 활용할 수 있도록 정리한 ${escapeHtml(profile.artifact)}입니다. ${escapeHtml(profile.outcome)}하는 데 초점을 맞췄습니다.</p>
<p>${escapeHtml(intro)}</p>`,
    `<h3>이 문서가 필요한 상황</h3>
<ul>
  <li>새 입찰이나 프로젝트를 앞두고 문서 골격을 빠르게 잡아야 할 때</li>
  <li>기존 산출물의 표현과 흐름을 평가·심사 관점으로 정리해야 할 때</li>
  <li>팀 내부 검토용 초안과 제출용 문서의 기준을 맞춰야 할 때</li>
</ul>`,
    `<h3>주요 구성</h3>
<ul>
  <li>${escapeHtml(profile.composition)}</li>
  <li>실무자가 바로 바꿔 쓸 수 있는 제목, 표, 문단 구조</li>
  <li>검토자에게 설명하기 쉬운 흐름 중심의 페이지 구성</li>
</ul>`,
    `<h3>활용 방법</h3>
<ul>
  <li>${escapeHtml(profile.editFocus)}하세요.</li>
  <li>발주처 RFP, 평가표, 내부 산출물 기준에 맞춰 항목명을 조정하세요.</li>
  <li>제출 전에는 보안, 개인정보, 저작권, 회사 고유정보를 반드시 재검토하세요.</li>
</ul>`,
    `<h3>파일 정보</h3>
<ul>
  <li>카테고리: ${escapeHtml(category)}</li>
  <li>파일 형식: ${escapeHtml(files)}</li>
  <li>제공 방식: 디지털 파일 다운로드</li>
</ul>`,
  ]

  return sections.join('\n')
}

function buildOverview(product, profile) {
  return [
    `${profile.audience}가 ${profile.stage}에 바로 참고할 수 있는 구조입니다.`,
    `${profile.composition}을 중심으로 문서 흐름을 잡았습니다.`,
    `회사명, 범위, 일정, 조직, 산출물 항목을 자사 상황에 맞게 편집할 수 있습니다.`,
  ].filter(Boolean)
}

function buildFeatures(product, profile) {
  const base = [
    `평가자가 따라가기 쉬운 문서 흐름`,
    `실무 문서에 바로 붙일 수 있는 구성`,
    `제출 전 내부 검토에 유리한 항목 정리`,
    `팀별 역할과 책임을 맞추기 쉬운 편집 구조`,
  ]

  if (product.title.includes('PDF 버전')) {
    return [
      '원본 구매 전 문서 구조를 확인하기 좋은 PDF 버전',
      '제안서 품질과 페이지 흐름을 빠르게 벤치마킹',
      '필요한 원본 문서 구매 여부를 판단하기 쉬운 구성',
    ]
  }

  if (product.is_free) {
    return [
      '처음 시작할 때 부담 없이 내려받아 확인 가능',
      ...base.slice(0, 3),
    ]
  }

  return base
}

function buildSpecs(product, category, profile, fileTypes) {
  const specs = [
    { label: '문서 유형', value: profile.artifact },
    { label: '활용 분야', value: profile.domain },
    { label: '권장 대상', value: profile.audience },
    { label: '활용 단계', value: profile.stage },
    { label: '파일 형식', value: fileTypes.length > 0 ? fileTypes.join(', ') : compactSpaces(product.format) || '원본 파일' },
    { label: '편집 방식', value: '관리자 에디터와 원본 문서에서 수정 가능' },
  ]

  if (product.pages) specs.splice(5, 0, { label: '페이지 수', value: `${product.pages}p` })
  if (product.file_size) specs.splice(6, 0, { label: '파일 크기', value: String(product.file_size) })
  if (category) specs.splice(1, 0, { label: '카테고리', value: category })
  return specs
}

function buildTags(product, category, profile, fileTypes) {
  const raw = [
    ...(Array.isArray(product.tags) ? product.tags : []),
    category,
    profile.domain,
    profile.artifact.replace(/\s+/g, ''),
    ...fileTypes,
    product.is_free ? '무료자료' : '원본자료',
  ]

  const normalized = []
  for (const tag of raw) {
    const text = compactSpaces(tag).replace(/^#/, '')
    if (!text || normalized.includes(text)) continue
    normalized.push(text)
  }
  return normalized.slice(0, 10)
}

async function main() {
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const [{ data: products, error: productError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,description,description_html,thumbnail_url,format,pages,file_size,category_id,category_ids,tags,is_free,is_published,overview,features,specs,file_types,preview_note,sort_order,created_at')
      .eq('is_published', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id,name'),
  ])

  if (productError) throw productError
  if (categoryError) throw categoryError

  const categoryMap = new Map((categories || []).map((category) => [category.id, category.name]))
  const backupPath = path.join(os.tmpdir(), `presales-product-detail-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(backupPath, JSON.stringify(products || [], null, 2), 'utf8')

  const updates = []
  for (const product of products || []) {
    const category = categoryName(product, categoryMap)
    const profile = inferProfile(product, category)
    const fileTypes = inferFileTypes(product)
    const next = {
      description: buildDescription(product, profile),
      description_html: buildHtml(product, category, profile, fileTypes),
      thumbnail_url: `/thumbnails/product-${product.id}.png`,
      overview: buildOverview(product, profile),
      features: buildFeatures(product, profile),
      specs: buildSpecs(product, category, profile, fileTypes),
      file_types: fileTypes,
      tags: buildTags(product, category, profile, fileTypes),
      seller: '프리세일즈',
      updated_at: new Date().toISOString(),
    }
    updates.push({ id: product.id, title: product.title, next })
  }

  if (dryRun) {
    console.log(JSON.stringify({
      mode: 'dry-run',
      count: updates.length,
      backupPath,
      sample: updates.slice(0, 3).map((update) => ({
        id: update.id,
        title: update.title,
        fields: Object.keys(update.next),
        thumbnail_url: update.next.thumbnail_url,
      })),
    }, null, 2))
    return
  }

  const results = []
  for (const update of updates) {
    const { error } = await supabase
      .from('products')
      .update(update.next)
      .eq('id', update.id)

    if (error) throw new Error(`Product ${update.id} update failed: ${error.message}`)
    results.push({ id: update.id, title: update.title })
  }

  console.log(JSON.stringify({
    mode: 'apply',
    updated: results.length,
    backupPath,
    productIds: results.map((result) => result.id),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
