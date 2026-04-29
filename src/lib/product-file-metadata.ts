export interface ProductFileMetadataInput {
  file_name: string | null
  file_size: number | string | null
}

const FILE_TYPE_ORDER = ['PDF', 'PPTX', 'PPT', 'XLSX', 'XLS', 'DOCX', 'DOC', 'HWP', 'ZIP'] as const

const FILE_TYPE_ALIASES: Record<string, string> = {
  PDF: 'PDF',
  PPTX: 'PPTX',
  PPT: 'PPT',
  XLSX: 'XLSX',
  XLS: 'XLS',
  DOCX: 'DOCX',
  DOC: 'DOC',
  HWP: 'HWP',
  ZIP: 'ZIP',
}

export function getProductFileExtension(fileName: string | null): string {
  if (!fileName) return ''
  const cleanName = fileName.split('?')[0]?.split('#')[0] || ''
  const dotIndex = cleanName.lastIndexOf('.')
  if (dotIndex < 0 || dotIndex === cleanName.length - 1) return ''
  return cleanName.slice(dotIndex + 1).trim().toUpperCase()
}

export function getProductFileType(fileName: string | null): string {
  const extension = getProductFileExtension(fileName)
  return FILE_TYPE_ALIASES[extension] || extension
}

export function normalizeProductFileSizeBytes(value: number | string | null): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : 0
  }
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function formatProductFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${Math.round(bytes)}B`
  if (bytes < 1024 * 1024) {
    const kb = bytes / 1024
    return `${kb >= 10 ? Math.round(kb) : Number(kb.toFixed(1))}KB`
  }
  const mb = bytes / (1024 * 1024)
  return `${mb >= 10 ? Math.round(mb) : Number(mb.toFixed(1))}MB`
}

export function summarizeProductFiles(files: ProductFileMetadataInput[]) {
  const typeSet = new Set<string>()
  let totalBytes = 0

  for (const file of files) {
    const type = getProductFileType(file.file_name)
    if (type) typeSet.add(type)
    totalBytes += normalizeProductFileSizeBytes(file.file_size)
  }

  const fileTypes = Array.from(typeSet).sort((a, b) => {
    const aIndex = FILE_TYPE_ORDER.indexOf(a as typeof FILE_TYPE_ORDER[number])
    const bIndex = FILE_TYPE_ORDER.indexOf(b as typeof FILE_TYPE_ORDER[number])
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  return {
    fileTypes,
    format: fileTypes.join(', '),
    fileSize: formatProductFileSize(totalBytes),
    totalBytes,
  }
}
