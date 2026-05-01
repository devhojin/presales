import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')
const GEMINI_UPLOAD_BASE = 'https://generativelanguage.googleapis.com'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const SUMMARY_MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash']
const IMAGE_MODELS = ['gemini-3.1-flash-image-preview', 'gemini-2.5-flash-image']
const GENERATED_PREFIX = 'preview-images/original-intros'
const PUBLIC_BUCKET = 'product-previews'

function loadEnv() {
  for (const envFile of ['.env.local', '.env.production.local']) {
    const envPath = path.join(ROOT, envFile)
    if (!fs.existsSync(envPath)) continue

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
      process.env[key] ||= value.replace(/\\n/g, '').trim()
    }
  }
}

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY
  const helper = '/Users/hojin/.codex/bin/get-gemini-api-key'
  if (!fs.existsSync(helper)) {
    throw new Error('GEMINI_API_KEY is missing and keychain helper was not found')
  }
  return execFileSync(helper, { encoding: 'utf8' }).trim()
}

function argValue(name) {
  const flag = `--${name}`
  const direct = process.argv.find((arg) => arg.startsWith(`${flag}=`))
  if (direct) return direct.slice(flag.length + 1)
  const idx = process.argv.indexOf(flag)
  return idx >= 0 ? process.argv[idx + 1] : undefined
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`)
}

function compact(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

function stripCodeFence(value) {
  return String(value ?? '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function parseJsonObject(value) {
  const raw = stripCodeFence(value)
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1))
    }
    throw new Error(`Could not parse Gemini JSON response: ${raw.slice(0, 180)}`)
  }
}

function normalizeSummary(value, fallbackSummary) {
  if (Array.isArray(value)) {
    const object = value.find((item) => item && typeof item === 'object' && !Array.isArray(item))
    return normalizeSummary(object ?? fallbackSummary, fallbackSummary)
  }

  if (!value || typeof value !== 'object') return fallbackSummary

  return {
    business_title: compact(value.business_title) || fallbackSummary.business_title,
    business_type: compact(value.business_type) || fallbackSummary.business_type,
    target_user: compact(value.target_user) || fallbackSummary.target_user,
    core_flow: Array.isArray(value.core_flow) && value.core_flow.length > 0
      ? value.core_flow.map(compact).filter(Boolean).slice(0, 4)
      : fallbackSummary.core_flow,
    visual_direction: compact(value.visual_direction) || fallbackSummary.visual_direction,
    visual_keywords: Array.isArray(value.visual_keywords) && value.visual_keywords.length > 0
      ? value.visual_keywords.map(compact).filter(Boolean).slice(0, 6)
      : fallbackSummary.visual_keywords,
  }
}

function textFromResponse(response) {
  return (response.candidates ?? [])
    .flatMap((candidate) => candidate.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .filter(Boolean)
    .join('\n')
    .trim()
}

function imageFromResponse(response) {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inlineData = part.inlineData ?? part.inline_data
      if (inlineData?.data) {
        return {
          buffer: Buffer.from(inlineData.data, 'base64'),
          mimeType: inlineData.mimeType ?? inlineData.mime_type ?? 'image/png',
        }
      }
    }
  }
  return null
}

function buildFallbackSummary(product) {
  const title = product.title
  const lower = title.toLowerCase()
  let businessType = '공공 시스템 구축 제안'
  let visualDirection = 'public sector system architecture and proposal workflow'
  const coreFlow = ['발주 요구 분석', '수행 전략 수립', '시스템 구축', '운영 관리']

  if (title.includes('IoT') || title.includes('원격감시')) {
    businessType = 'IoT 시설물 원격감시 체계 구축'
    visualDirection = 'IoT sensors, field facilities, command center dashboard, secure data flow'
    coreFlow.splice(0, coreFlow.length, '현장 센서 수집', '통신망 연계', '관제 대시보드', '알림·출동 대응')
  } else if (title.includes('안전플랫폼') || title.includes('관제')) {
    businessType = '안전 플랫폼 관제 시스템 구축'
    visualDirection = 'integrated safety command center with maps, alerts, CCTV and MMI dashboards'
    coreFlow.splice(0, coreFlow.length, '현장 상황 수집', 'MMI 관제 화면', '위험 알림', '대응 이력 관리')
  } else if (title.includes('금융')) {
    businessType = '금융 시스템 유지운영'
    visualDirection = 'financial operations control tower, service continuity, incident response, SLA metrics'
    coreFlow.splice(0, coreFlow.length, '서비스 모니터링', '장애 대응', '변경 관리', '운영 리포트')
  } else if (title.includes('홈페이지') || title.includes('포털')) {
    businessType = '공공 웹서비스 유지보수 및 고도화'
    visualDirection = 'public web portal renewal, CMS operations, user services, maintenance workflow'
    coreFlow.splice(0, coreFlow.length, '현황 분석', '기능 개선', '콘텐츠 운영', '유지보수 체계')
  } else if (title.includes('악성코드') || title.includes('보안')) {
    businessType = '보안 대응 및 기술지원'
    visualDirection = 'cybersecurity operations center, malware site detection, response playbook, secure network'
    coreFlow.splice(0, coreFlow.length, '위협 탐지', '악성코드 분석', '차단 조치', '기술지원 보고')
  } else if (title.includes('디자인DB') || title.includes('박물관')) {
    businessType = '산업활용 디자인 데이터베이스 구축'
    visualDirection = 'museum design archive, digital asset database, metadata curation, public search service'
    coreFlow.splice(0, coreFlow.length, '자료 수집', '메타데이터 정리', 'DB 구축', '검색 서비스 제공')
  } else if (title.includes('교육 플랫폼')) {
    businessType = '네트워크 보안 인력 양성 교육 플랫폼'
    visualDirection = 'cyber training platform, LMS, practice lab, learner analytics dashboard'
    coreFlow.splice(0, coreFlow.length, '교육 과정 설계', '실습 환경 구축', '학습 관리', '성과 분석')
  } else if (title.includes('물류') || title.includes('농산물')) {
    businessType = '농산물 물류 추적 및 관리 시스템'
    visualDirection = 'farm to logistics traceability, QR/RFID data flow, cold chain, monitoring dashboard'
    coreFlow.splice(0, coreFlow.length, '생산 이력 수집', '물류 추적', '품질 관리', '대시보드 보고')
  } else if (title.includes('ISP') || lower.includes('isp')) {
    businessType = '정보화 전략계획 수립'
    visualDirection = 'enterprise architecture roadmap, current-state analysis, target model, phased plan'
    coreFlow.splice(0, coreFlow.length, '현황 진단', '목표 모델 설계', '과제 도출', '이행 로드맵')
  } else if (title.includes('예비창업')) {
    businessType = '창업지원 사업계획'
    visualDirection = 'startup business model canvas, market validation, execution roadmap, funding plan'
    coreFlow.splice(0, coreFlow.length, '문제 정의', '솔루션 검증', '시장 진입', '사업화 계획')
  }

  return {
    business_title: title,
    business_type: businessType,
    target_user: '공공조달 제안서 작성자와 사업 PM',
    core_flow: coreFlow,
    visual_direction: visualDirection,
    visual_keywords: [businessType, ...coreFlow],
  }
}

async function fetchJson(url, options, context) {
  const response = await fetch(url, options)
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${context} failed (${response.status}): ${text.slice(0, 800)}`)
  }
  return response.json()
}

async function uploadGeminiFile(apiKey, buffer, displayName) {
  const start = await fetch(`${GEMINI_UPLOAD_BASE}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(buffer.length),
      'X-Goog-Upload-Header-Content-Type': 'application/pdf',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  })

  if (!start.ok) {
    throw new Error(`Gemini file upload start failed (${start.status}): ${(await start.text()).slice(0, 800)}`)
  }

  const uploadUrl = start.headers.get('x-goog-upload-url')
  if (!uploadUrl) throw new Error('Gemini upload URL missing')

  const uploaded = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Length': String(buffer.length),
      'X-Goog-Upload-Offset': '0',
      'X-Goog-Upload-Command': 'upload, finalize',
    },
    body: buffer,
  })

  if (!uploaded.ok) {
    throw new Error(`Gemini file upload failed (${uploaded.status}): ${(await uploaded.text()).slice(0, 800)}`)
  }

  const payload = await uploaded.json()
  return payload.file
}

async function waitForGeminiFile(apiKey, file) {
  const name = file.name
  for (let attempt = 0; attempt < 45; attempt += 1) {
    const current = await fetchJson(
      `${GEMINI_API_BASE}/${name}?key=${encodeURIComponent(apiKey)}`,
      { method: 'GET' },
      `Gemini file status ${name}`,
    )
    const state = current.state ?? current.file?.state
    if (!state || state === 'ACTIVE') return current
    if (state === 'FAILED') throw new Error(`Gemini file processing failed for ${name}`)
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  throw new Error(`Gemini file did not become ACTIVE: ${name}`)
}

async function generateWithFallback(apiKey, models, body, purpose) {
  const errors = []
  for (const model of models) {
    try {
      const response = await fetchJson(
        `${GEMINI_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        `${purpose} with ${model}`,
      )
      return { model, response }
    } catch (error) {
      errors.push(`${model}: ${error.message}`)
    }
  }
  throw new Error(`${purpose} failed with all models:\n${errors.join('\n')}`)
}

async function summarizePdf(apiKey, product, file, fallbackSummary) {
  const prompt = [
    '너는 공공조달 제안서 상품 소개 이미지를 기획하는 프리세일즈 콘텐츠 디렉터다.',
    '첨부 PDF 미리보기를 읽고 이 상품이 어떤 사업의 제안서인지 파악해라.',
    '허위 정보는 넣지 말고 PDF와 상품명에서 확인 가능한 범위로만 정리해라.',
    '이미지 생성에 쓸 수 있도록 JSON만 반환해라.',
    '',
    `상품 ID: ${product.id}`,
    `상품명: ${product.title}`,
    `기존 설명: ${compact(product.description) || compact(fallbackSummary.business_type)}`,
    '',
    'JSON schema:',
    '{',
    '  "business_title": "사업을 한 문장으로 설명",',
    '  "business_type": "사업 유형",',
    '  "target_user": "이 문서를 볼 실무자",',
    '  "core_flow": ["핵심 흐름 4개 이하"],',
    '  "visual_direction": "이미지로 표현할 장면/개념도 방향",',
    '  "visual_keywords": ["시각 요소 키워드 6개 이하"]',
    '}',
  ].join('\n')

  const body = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { file_data: { mime_type: 'application/pdf', file_uri: file.uri } },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.25,
    },
  }

  try {
    const { model, response } = await generateWithFallback(apiKey, SUMMARY_MODELS, body, `PDF summary for product ${product.id}`)
    return { summary: normalizeSummary(parseJsonObject(textFromResponse(response)), fallbackSummary), summaryModel: model }
  } catch (error) {
    return { summary: fallbackSummary, summaryModel: `fallback (${error.message.slice(0, 120)})` }
  }
}

function buildImagePrompt(product, summary) {
  const flow = Array.isArray(summary.core_flow) ? summary.core_flow.slice(0, 4).join(' -> ') : ''
  const keywords = Array.isArray(summary.visual_keywords) ? summary.visual_keywords.join(', ') : ''
  return [
    'Create one premium 16:9 visual image for a Korean public procurement proposal product page.',
    'The image must explain the business at a glance as a sophisticated concept visual or system architecture scene.',
    'Do not include readable text, logos, brand marks, watermarks, UI labels, captions, or Korean typography inside the image.',
    'Use a polished enterprise B2B style: clean composition, Korean public-sector procurement tone, deep navy, white, cobalt blue, subtle cyan accents, realistic documents and dashboard elements, sharp lighting, high resolution.',
    '',
    `Product title: ${product.title}`,
    `Business type: ${compact(summary.business_type)}`,
    `Business title: ${compact(summary.business_title)}`,
    `Core flow: ${flow}`,
    `Visual direction: ${compact(summary.visual_direction)}`,
    `Visual keywords: ${keywords}`,
    '',
    'Make it immediately understandable for a buyer scanning the product page.',
  ].join('\n')
}

async function generateImage(apiKey, product, summary) {
  const prompt = buildImagePrompt(product, summary)
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: { aspectRatio: '16:9' },
      temperature: 0.55,
    },
  }

  const { model, response } = await generateWithFallback(apiKey, IMAGE_MODELS, body, `image generation for product ${product.id}`)
  const image = imageFromResponse(response)
  if (!image) {
    throw new Error(`Gemini did not return image data for product ${product.id}`)
  }
  return { model, image, prompt }
}

function extensionForMime(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  return 'png'
}

async function uploadIntroImage(supabase, product, image) {
  const ext = extensionForMime(image.mimeType)
  const storagePath = `${GENERATED_PREFIX}/${product.id}/business-overview.${ext}`
  const { error } = await supabase.storage
    .from(PUBLIC_BUCKET)
    .upload(storagePath, image.buffer, {
      cacheControl: '31536000',
      contentType: image.mimeType,
      upsert: true,
    })
  if (error) throw error

  const { data } = supabase.storage.from(PUBLIC_BUCKET).getPublicUrl(storagePath)
  return { publicUrl: data.publicUrl, storagePath, bytes: image.buffer.length }
}

async function main() {
  loadEnv()
  const apiKey = getGeminiApiKey()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase env is missing')

  const productId = argValue('id')
  const limit = Number(argValue('limit') ?? '0')
  const dryRun = hasFlag('dry-run')
  const force = hasFlag('force')
  const summaryOnly = hasFlag('summary-only')

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
  const { data: matches, error: matchesError } = await supabase
    .from('product_discount_matches')
    .select('target_product_id')
    .eq('is_active', true)
    .order('target_product_id')
  if (matchesError) throw matchesError

  let ids = Array.from(new Set((matches ?? []).map((match) => Number(match.target_product_id)).filter(Boolean)))
  if (productId) ids = ids.filter((id) => String(id) === String(productId))
  if (limit > 0) ids = ids.slice(0, limit)
  if (ids.length === 0) throw new Error('No original products found')

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id,title,description,overview,format,pages,preview_pdf_url,preview_images,is_published')
    .in('id', ids)
    .eq('is_published', true)
    .order('id')
  if (productsError) throw productsError

  const cacheDir = path.join(os.tmpdir(), 'presales-original-intro-images')
  fs.mkdirSync(cacheDir, { recursive: true })

  const results = []
  for (const product of products ?? []) {
    if (!product.preview_pdf_url) {
      results.push({ id: product.id, title: product.title, status: 'skipped-no-preview-pdf' })
      continue
    }

    const existingImages = Array.isArray(product.preview_images) ? product.preview_images : []
    const hasGenerated = existingImages.some((url) => url.includes(`/${GENERATED_PREFIX}/${product.id}/`))
    if (hasGenerated && !force) {
      results.push({ id: product.id, title: product.title, status: 'skipped-existing-generated-image' })
      continue
    }

    console.log(`[${product.id}] download PDF`)
    const pdfResponse = await fetch(product.preview_pdf_url)
    if (!pdfResponse.ok) throw new Error(`PDF download failed for ${product.id}: ${pdfResponse.status}`)
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    console.log(`[${product.id}] upload PDF to Gemini`)
    const geminiFile = await uploadGeminiFile(apiKey, pdfBuffer, `presales-original-${product.id}.pdf`)
    const activeFile = await waitForGeminiFile(apiKey, geminiFile)

    const fallbackSummary = buildFallbackSummary(product)
    console.log(`[${product.id}] summarize PDF`)
    const { summary, summaryModel } = await summarizePdf(apiKey, product, activeFile, fallbackSummary)

    let imageUrl = null
    let imageModel = null
    let bytes = 0
    if (!summaryOnly) {
      console.log(`[${product.id}] generate image`)
      const { model, image } = await generateImage(apiKey, product, summary)
      imageModel = model

      const localPath = path.join(cacheDir, `product-${product.id}.${extensionForMime(image.mimeType)}`)
      fs.writeFileSync(localPath, image.buffer)
      bytes = image.buffer.length

      if (!dryRun) {
        console.log(`[${product.id}] upload image`)
        const uploaded = await uploadIntroImage(supabase, product, image)
        imageUrl = uploaded.publicUrl

        const nextImages = [
          imageUrl,
          ...existingImages.filter((url) => !url.includes(`/${GENERATED_PREFIX}/${product.id}/`)),
        ]
        const { error: updateError } = await supabase
          .from('products')
          .update({ preview_images: nextImages, updated_at: new Date().toISOString() })
          .eq('id', product.id)
        if (updateError) throw updateError
      }
    }

    results.push({
      id: product.id,
      title: product.title,
      status: dryRun || summaryOnly ? 'generated-local-only' : 'updated',
      summaryModel,
      imageModel,
      imageUrl,
      bytes,
      summary,
    })
  }

  const reportPath = path.join(cacheDir, `report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8')
  console.log(JSON.stringify({
    processed: results.length,
    updated: results.filter((result) => result.status === 'updated').length,
    dryRun,
    summaryOnly,
    reportPath,
    productIds: results.map((result) => result.id),
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
