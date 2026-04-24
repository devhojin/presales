import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf-8')
const env = {}

for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  let value = trimmed.slice(idx + 1).trim()
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1)
  env[trimmed.slice(0, idx).trim()] = value
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 없습니다.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } })
const documentsRoot = path.join(__dirname, '..', 'documents_presales')
const productFilesBucket = 'product-files'
const missingPreviewNote = '이 상품은 별도 PDF/이미지 미리보기를 제공하지 않습니다. 상품 썸네일과 상세 설명을 먼저 확인한 뒤 구매해주세요.'

const localUploadRules = [
  {
    productId: 88,
    sourcePath: path.join(documentsRoot, '07_무료_산출물템플릿', 'WBS.xls'),
    fileName: 'WBS.xls',
    format: 'XLS',
  },
  {
    productId: 90,
    sourcePath: path.join(documentsRoot, '01_기술제안서_PPT', 'A3_가로제안서_떡제본(무선제본)_202405.pptx'),
    fileName: 'A3_가로제안서_떡제본(무선제본)_202405.pptx',
  },
]

const cloneRules = [
  { productId: 64, sourceProductId: 20, match: /\.pdf$/i },
  { productId: 65, sourceProductId: 23, match: /\.pdf$/i },
  { productId: 68, sourceProductId: 27, match: /pdf/i, format: 'PDF ZIP' },
  { productId: 72, sourceProductId: 32, match: /pdf/i, format: 'PDF ZIP' },
  { productId: 74, sourceProductId: 35, match: /\.pdf$/i },
  { productId: 75, sourceProductId: 36, match: /\.pdf$/i },
  { productId: 76, sourceProductId: 37, match: /\.pdf$/i },
  { productId: 77, sourceProductId: 38, match: /\.pdf$/i },
  { productId: 78, sourceProductId: 39, match: /pdf/i, format: 'PDF ZIP' },
  { productId: 79, sourceProductId: 40, match: /pdf/i, format: 'PDF ZIP' },
  { productId: 82, sourceProductId: 44, match: /\.pdf$/i },
]

const mimeMap = {
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.zip': 'application/zip',
}

function getMimeType(fileName) {
  return mimeMap[path.extname(fileName).toLowerCase()] || 'application/octet-stream'
}

function buildStoragePath(productId, fileName) {
  const ext = path.extname(fileName).toLowerCase()
  return `products/${productId}/recovered_${Date.now()}${ext}`
}

async function uploadProductFile(productId, sourcePath, fileName) {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`로컬 파일이 없습니다: ${sourcePath}`)
  }

  const buffer = fs.readFileSync(sourcePath)
  const storagePath = buildStoragePath(productId, fileName)
  const contentType = getMimeType(fileName)

  const { error: uploadError } = await supabase
    .storage
    .from(productFilesBucket)
    .upload(storagePath, buffer, { upsert: true, contentType })

  if (uploadError) throw uploadError

  const { data: publicUrlData } = supabase.storage.from(productFilesBucket).getPublicUrl(storagePath)
  const fileUrl = publicUrlData.publicUrl

  const { error: insertError } = await supabase.from('product_files').insert({
    product_id: productId,
    file_name: fileName,
    file_url: fileUrl,
    file_size: buffer.byteLength,
  })

  if (insertError) throw insertError
  return fileUrl
}

async function main() {
  const { data: products, error: productError } = await supabase
    .from('products')
    .select('id, title, is_published, is_free, format, preview_pdf_url, preview_images, preview_note')
    .order('id')

  if (productError) throw productError

  const { data: productFiles, error: filesError } = await supabase
    .from('product_files')
    .select('id, product_id, file_name, file_url, file_size')
    .order('product_id')
    .order('id')

  if (filesError) throw filesError

  const productMap = new Map((products || []).map((product) => [product.id, product]))
  const filesByProductId = new Map()

  for (const file of productFiles || []) {
    const current = filesByProductId.get(file.product_id) || []
    current.push(file)
    filesByProductId.set(file.product_id, current)
  }

  const summary = {
    localUploads: [],
    clones: [],
    previewLinked: [],
    previewNotes: [],
    unpublished: [],
    formatUpdates: [],
  }

  for (const rule of localUploadRules) {
    const existingFiles = filesByProductId.get(rule.productId) || []
    if (existingFiles.length > 0) continue

    const fileUrl = await uploadProductFile(rule.productId, rule.sourcePath, rule.fileName)
    const nextFiles = [
      ...existingFiles,
      {
        product_id: rule.productId,
        file_name: rule.fileName,
        file_url: fileUrl,
        file_size: fs.statSync(rule.sourcePath).size,
      },
    ]
    filesByProductId.set(rule.productId, nextFiles)
    summary.localUploads.push({ productId: rule.productId, fileName: rule.fileName })

    if (rule.format) {
      const { error } = await supabase.from('products').update({ format: rule.format }).eq('id', rule.productId)
      if (error) throw error
      const product = productMap.get(rule.productId)
      if (product) product.format = rule.format
      summary.formatUpdates.push({ productId: rule.productId, format: rule.format })
    }
  }

  for (const rule of cloneRules) {
    const existingFiles = filesByProductId.get(rule.productId) || []
    if (existingFiles.length > 0) continue

    const sourceFiles = filesByProductId.get(rule.sourceProductId) || []
    const sourceFile = sourceFiles.find((file) => rule.match.test(file.file_name))
    if (!sourceFile) continue

    const { error: insertError } = await supabase.from('product_files').insert({
      product_id: rule.productId,
      file_name: sourceFile.file_name,
      file_url: sourceFile.file_url,
      file_size: sourceFile.file_size,
    })
    if (insertError) throw insertError

    const nextFiles = [...existingFiles, { ...sourceFile, product_id: rule.productId }]
    filesByProductId.set(rule.productId, nextFiles)
    summary.clones.push({ productId: rule.productId, sourceProductId: rule.sourceProductId, fileName: sourceFile.file_name })

    if (rule.format) {
      const { error } = await supabase.from('products').update({ format: rule.format }).eq('id', rule.productId)
      if (error) throw error
      const product = productMap.get(rule.productId)
      if (product) product.format = rule.format
      summary.formatUpdates.push({ productId: rule.productId, format: rule.format })
    }
  }

  for (const product of products || []) {
    const files = filesByProductId.get(product.id) || []
    const directPdf = files.find((file) => /\.pdf$/i.test(file.file_name))
    const hasPreviewImages = Array.isArray(product.preview_images) && product.preview_images.length > 0

    if (!product.preview_pdf_url && directPdf) {
      const { error } = await supabase
        .from('products')
        .update({
          preview_pdf_url: directPdf.file_url,
          preview_clear_pages: 3,
          preview_blur_pages: 5,
        })
        .eq('id', product.id)
      if (error) throw error
      product.preview_pdf_url = directPdf.file_url
      summary.previewLinked.push({ productId: product.id, source: 'direct-pdf-file' })
    }

    if (product.is_published && files.length === 0) {
      const { error } = await supabase.from('products').update({ is_published: false }).eq('id', product.id)
      if (error) throw error
      product.is_published = false
      summary.unpublished.push({ productId: product.id, title: product.title })
      continue
    }

    if (
      product.is_published &&
      !product.is_free &&
      files.length > 0 &&
      !product.preview_pdf_url &&
      !hasPreviewImages &&
      !product.preview_note
    ) {
      const { error } = await supabase
        .from('products')
        .update({ preview_note: missingPreviewNote })
        .eq('id', product.id)
      if (error) throw error
      product.preview_note = missingPreviewNote
      summary.previewNotes.push({ productId: product.id, title: product.title })
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
