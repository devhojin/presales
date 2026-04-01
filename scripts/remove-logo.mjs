import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

async function processImage(inputPath, outputPath, thumbnailPath) {
  const { data, info } = await sharp(inputPath).raw().toBuffer({ resolveWithObject: true })
  const w = info.width, h = info.height, ch = info.channels
  const idx = ((h - 150) * w + (w - 150)) * ch
  const hex = '#' + [data[idx], data[idx+1], data[idx+2]].map(v => v.toString(16).padStart(2, '0')).join('')
  const overlay = Buffer.from(`<svg width="160" height="160"><rect width="160" height="160" fill="${hex}"/></svg>`)
  await sharp(inputPath).composite([{ input: overlay, left: w - 160, top: h - 160 }]).toFile(outputPath)
  if (thumbnailPath) {
    await sharp(outputPath).resize(750, 750, { fit: 'cover' }).toFile(thumbnailPath)
  }
}

const tasks = [
  { dir: '상품이력제 정보시스템 구축 사업', id: 46 },
  { dir: '프로젝트 평가서', id: 16 },
]

const base = 'C:/Users/hojin/Dropbox/startup-partner-center/sales_document'
const thumbDir = 'C:/Users/hojin/Dropbox/presales/public/thumbnails'

for (const t of tasks) {
  const dir = path.join(base, t.dir)
  const files = fs.readdirSync(dir).filter(f => f.startsWith('Gemini'))
  if (files.length === 0) { console.log(`skip ${t.id}`); continue }
  const gemini = files.sort().pop()
  const input = path.join(dir, gemini)
  const preview = path.join(dir, `미리보기 이미지_${t.dir}.png`)
  const thumb = path.join(thumbDir, `product-${t.id}.png`)
  await processImage(input, preview, thumb)
  console.log(`✅ product-${t.id}`)
}
