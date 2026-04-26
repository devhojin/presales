/**
 * docs/*.md → Supabase Storage `docs` 버킷에 업로드
 * 실행: npx tsx morning-brief/scripts/upload-docs.ts
 *
 * 환경변수 (.env.local 또는 export):
 *   MORNING_BRIEF_SUPABASE_URL
 *   MORNING_BRIEF_SUPABASE_SERVICE_KEY   ← service_role key (Supabase 대시보드에서 복사)
 */
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DOCS_DIR = join(__dirname, '..', 'docs')

const url = process.env.MORNING_BRIEF_SUPABASE_URL
const key = process.env.MORNING_BRIEF_SUPABASE_SERVICE_KEY
if (!url || !key) {
  console.error('환경변수 MORNING_BRIEF_SUPABASE_URL / MORNING_BRIEF_SUPABASE_SERVICE_KEY 필요')
  process.exit(1)
}

const sb = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  const files = (await readdir(DOCS_DIR)).filter((f) => f.endsWith('.md'))
  for (const file of files) {
    const buf = await readFile(join(DOCS_DIR, file))
    const { error } = await sb.storage.from('docs').upload(file, buf, {
      contentType: 'text/markdown; charset=utf-8',
      upsert: true,
    })
    if (error) {
      console.error(`✗ ${file}: ${error.message}`)
    } else {
      console.log(`✓ ${file} (${buf.byteLength} bytes)`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
