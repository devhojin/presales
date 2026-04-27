/**
 * Thumbnail Generator — Presales catalog thumbnails
 *
 * Generates one price-free thumbnail per published product from Supabase.
 * The product price is intentionally never rendered into the design.
 *
 * Usage:
 *   node scripts/generate-thumbnails.js
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const { createClient } = require('@supabase/supabase-js')

const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'thumbnails')

const CATEGORY_PALETTES = {
  기술제안서: {
    bg1: '#101827',
    bg2: '#20324A',
    accent: '#3B82F6',
    soft: '#DBEAFE',
  },
  입찰가이드: {
    bg1: '#171717',
    bg2: '#3F3422',
    accent: '#D6A84F',
    soft: '#FEF3C7',
  },
  발표자료: {
    bg1: '#18181B',
    bg2: '#4A2E1F',
    accent: '#EA7A2A',
    soft: '#FFEDD5',
  },
  사업계획서: {
    bg1: '#0F1F1A',
    bg2: '#1E3A2F',
    accent: '#3FA77A',
    soft: '#D1FAE5',
  },
  가격제안: {
    bg1: '#111827',
    bg2: '#263B35',
    accent: '#22A06B',
    soft: '#DCFCE7',
  },
  풀패키지: {
    bg1: '#121212',
    bg2: '#29323C',
    accent: '#67A9A7',
    soft: '#CCFBF1',
  },
  문서: {
    bg1: '#18181B',
    bg2: '#2F3742',
    accent: '#7C8A99',
    soft: '#F4F4F5',
  },
}

const FILE_TYPE_COLORS = {
  PPT: '#EA580C',
  PDF: '#DC2626',
  XLS: '#16A34A',
  DOC: '#2563EB',
  HWP: '#0EA5E9',
  ZIP: '#52525B',
}

function loadEnv() {
  const envPath = path.join(ROOT, '.env.local')
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

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function normalizeFileTypes(product) {
  const fromField = Array.isArray(product.file_types)
    ? product.file_types
    : product.file_types && Array.isArray(product.file_types.items)
      ? product.file_types.items
      : []

  const values = fromField
    .map((type) => String(type).trim().toUpperCase())
    .filter(Boolean)

  if (values.length > 0) return Array.from(new Set(values.map(normalizeFileType)))

  const found = new Set()
  const format = String(product.format || '').toUpperCase()
  for (const type of ['PPTX', 'PPT', 'PDF', 'XLSX', 'XLS', 'DOCX', 'DOC', 'HWP', 'ZIP']) {
    if (format.includes(type)) found.add(normalizeFileType(type))
  }
  return Array.from(found)
}

function normalizeFileType(type) {
  if (type === 'PPTX') return 'PPT'
  if (type === 'XLSX') return 'XLS'
  if (type === 'DOCX') return 'DOC'
  return type
}

function getCategoryName(product, categoryMap) {
  const ids = Array.isArray(product.category_ids) && product.category_ids.length > 0
    ? product.category_ids
    : product.category_id
      ? [product.category_id]
      : []
  return ids.map((id) => categoryMap.get(id)).find(Boolean) || '문서'
}

function getPalette(categoryName) {
  const compact = categoryName.replace(/\s+/g, '')
  return CATEGORY_PALETTES[categoryName] || CATEGORY_PALETTES[compact] || CATEGORY_PALETTES.문서
}

function wrapKoreanTitle(title, maxUnits = 12) {
  const tokens = title.replace(/\s+/g, ' ').trim().split(' ')
  const lines = []
  let current = ''

  for (const token of tokens) {
    const next = current ? `${current} ${token}` : token
    if (measureTextUnits(next) > maxUnits && current) {
      lines.push(current)
      current = token
    } else {
      current = next
    }
  }
  if (current) lines.push(current)

  const balanced = []
  for (const line of lines) {
    if (measureTextUnits(line) <= maxUnits + 4) {
      balanced.push(line)
      continue
    }
    const chars = Array.from(line)
    let part = ''
    for (const char of chars) {
      const next = part + char
      if (measureTextUnits(next) > maxUnits && part) {
        balanced.push(part)
        part = char
      } else {
        part = next
      }
    }
    if (part) balanced.push(part)
  }

  return balanced.slice(0, 3)
}

function measureTextUnits(text) {
  return Array.from(text).reduce((sum, char) => sum + (/[ -~]/.test(char) ? 0.55 : 1), 0)
}

function generateSvg(product, categoryName) {
  const palette = getPalette(categoryName)
  const fileTypes = normalizeFileTypes(product)
  const titleLines = wrapKoreanTitle(product.title)
  const titleSize = titleLines.length >= 3 ? 40 : titleLines.some((line) => measureTextUnits(line) > 10) ? 44 : 50
  const lineHeight = titleSize * 1.22
  const titleY = 238
  const productNo = String(product.id).padStart(3, '0')
  const status = product.is_free ? 'FREE TEMPLATE' : 'PRESALES ORIGINAL'
  const titleBlock = titleLines
    .map((line, index) => (
      `<text x="64" y="${titleY + index * lineHeight}" font-family="Arial, Malgun Gothic, sans-serif" font-size="${titleSize}" font-weight="800" fill="#FAFAFA" letter-spacing="-0.8">${escapeXml(line)}</text>`
    ))
    .join('\n')

  let badgeX = 64
  const badges = fileTypes.slice(0, 4).map((type) => {
    const width = Math.max(54, type.length * 18 + 24)
    const color = FILE_TYPE_COLORS[type] || '#52525B'
    const markup = [
      `<rect x="${badgeX}" y="488" width="${width}" height="34" rx="10" fill="${color}"/>`,
      `<text x="${badgeX + width / 2}" y="510" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="800" fill="#FFFFFF" letter-spacing="0.8">${escapeXml(type)}</text>`,
    ].join('\n')
    badgeX += width + 10
    return markup
  }).join('\n')

  return `<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${palette.bg1}"/>
      <stop offset="100%" stop-color="${palette.bg2}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.075)" stroke-width="1"/>
    </pattern>
    <filter id="paper" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#05070B" flood-opacity="0.32"/>
    </filter>
  </defs>

  <rect width="800" height="600" fill="url(#bg)"/>
  <rect width="800" height="600" fill="url(#grid)" opacity="0.55"/>
  <path d="M610 70 L742 70 L742 360 L610 360 Z" fill="rgba(255,255,255,0.08)" filter="url(#paper)"/>
  <path d="M632 108 H716 M632 140 H716 M632 172 H690 M632 238 H716 M632 270 H700" stroke="rgba(255,255,255,0.24)" stroke-width="8" stroke-linecap="round"/>
  <path d="M0 548 H800" stroke="${palette.accent}" stroke-width="7"/>
  <path d="M64 104 H170" stroke="${palette.accent}" stroke-width="5" stroke-linecap="round"/>

  <rect x="64" y="52" width="34" height="34" rx="9" fill="${palette.accent}"/>
  <text x="81" y="74" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="#FFFFFF">PS</text>
  <text x="112" y="74" font-family="Arial, sans-serif" font-size="14" font-weight="800" fill="rgba(255,255,255,0.48)" letter-spacing="1.2">PRESALES</text>

  <text x="64" y="154" font-family="Arial, Malgun Gothic, sans-serif" font-size="13" font-weight="800" fill="${palette.soft}" letter-spacing="2.4">${escapeXml(status)}</text>
  <text x="64" y="184" font-family="Arial, Malgun Gothic, sans-serif" font-size="15" font-weight="700" fill="rgba(255,255,255,0.54)" letter-spacing="1.5">${escapeXml(categoryName)} / DOC-${productNo}</text>
  ${titleBlock}
  ${badges}
</svg>`
}

async function main() {
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and a Supabase key are required in .env.local')
  }

  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })
  const [{ data: products, error: productError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase
      .from('products')
      .select('id,title,is_free,format,file_types,category_id,category_ids,sort_order,created_at')
      .eq('is_published', true)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('id,name'),
  ])

  if (productError) throw productError
  if (categoryError) throw categoryError

  const categoryMap = new Map((categories || []).map((category) => [category.id, category.name]))
  fs.mkdirSync(OUT_DIR, { recursive: true })

  for (const product of products || []) {
    const categoryName = getCategoryName(product, categoryMap)
    const svg = generateSvg(product, categoryName)
    const outPath = path.join(OUT_DIR, `product-${product.id}.png`)
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(outPath)
  }

  console.log(`Generated ${(products || []).length} price-free thumbnails in ${path.relative(ROOT, OUT_DIR)}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
