import { getProductFileExtension, normalizeProductFileSizeBytes } from './product-file-metadata'

interface StoredPageCountFile {
  file_name: string | null
  file_url: string | null
  file_size: number | string | null
}

const MAX_PAGE_COUNT_BYTES = 120 * 1024 * 1024

function decodeBuffer(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer)
}

function countPdfPages(buffer: ArrayBuffer): number | null {
  const text = decodeBuffer(buffer)
  const matches = text.match(/\/Type\s*\/Page\b/g)
  return matches && matches.length > 0 ? matches.length : null
}

function countPptxSlides(buffer: ArrayBuffer): number | null {
  const text = decodeBuffer(buffer)
  const slides = new Set<string>()
  for (const match of text.matchAll(/ppt\/slides\/slide(\d+)\.xml/g)) {
    slides.add(match[1])
  }
  return slides.size > 0 ? slides.size : null
}

function isCountablePageFile(fileName: string | null): boolean {
  const extension = getProductFileExtension(fileName)
  return extension === 'PDF' || extension === 'PPTX'
}

function countPagesFromBuffer(fileName: string | null, buffer: ArrayBuffer): number | null {
  const extension = getProductFileExtension(fileName)
  if (extension === 'PDF') return countPdfPages(buffer)
  if (extension === 'PPTX') return countPptxSlides(buffer)
  return null
}

export async function detectFilePageCountFromFile(file: File): Promise<number | null> {
  if (!isCountablePageFile(file.name)) return null
  if (file.size > MAX_PAGE_COUNT_BYTES) return null
  return countPagesFromBuffer(file.name, await file.arrayBuffer())
}

export async function detectFilePageCountFromUrl(file: StoredPageCountFile): Promise<number | null> {
  if (!isCountablePageFile(file.file_name)) return null
  if (!file.file_url) return null
  const bytes = normalizeProductFileSizeBytes(file.file_size)
  if (bytes > MAX_PAGE_COUNT_BYTES) return null

  try {
    const response = await fetch(file.file_url)
    if (!response.ok) return null
    return countPagesFromBuffer(file.file_name, await response.arrayBuffer())
  } catch {
    return null
  }
}

export async function detectProductFilesPageTotal(files: StoredPageCountFile[]): Promise<number | null> {
  const countableFiles = files.filter((file) => isCountablePageFile(file.file_name))
  if (countableFiles.length === 0) return null

  const counts = await Promise.all(countableFiles.map((file) => detectFilePageCountFromUrl(file)))
  const knownCounts = counts.filter((count): count is number => count !== null)
  if (knownCounts.length !== counts.length) return null

  const total = knownCounts.reduce((sum, count) => sum + count, 0)
  return total > 0 ? total : null
}
