export type DocumentOrientationKey = 'landscape' | 'portrait'
export type DocumentOrientationFilter = DocumentOrientationKey | 'unset'

export const DOCUMENT_ORIENTATION_FILTERS = ['landscape', 'portrait', 'unset'] as const

export const DOCUMENT_ORIENTATION_LABELS: Record<DocumentOrientationFilter, string> = {
  landscape: '가로형',
  portrait: '세로형',
  unset: '미선택',
}

function flattenDocumentOrientation(value: unknown, depth = 0): string[] {
  if (value == null || depth > 5) return []

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenDocumentOrientation(item, depth + 1))
  }

  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  if (
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    try {
      return flattenDocumentOrientation(JSON.parse(trimmed), depth + 1)
    } catch {
      return [trimmed]
    }
  }

  return [trimmed]
}

export function getDocumentOrientationKeys(value: unknown): DocumentOrientationKey[] {
  const keys = new Set<DocumentOrientationKey>()

  flattenDocumentOrientation(value).forEach((item) => {
    const lower = item.toLowerCase()

    if (lower === 'landscape' || lower === 'horizontal' || item.includes('가로')) {
      keys.add('landscape')
    }
    if (lower === 'portrait' || lower === 'vertical' || item.includes('세로')) {
      keys.add('portrait')
    }
  })

  return [...keys]
}

export function getDocumentOrientationLabels(value: unknown): string[] {
  return getDocumentOrientationKeys(value).map((key) => DOCUMENT_ORIENTATION_LABELS[key])
}

export function isDocumentOrientationUnset(value: unknown): boolean {
  return getDocumentOrientationKeys(value).length === 0
}

export function normalizeDocumentOrientationFormValue(value: unknown, fallback: string[] = ['가로형']): string[] {
  const labels = getDocumentOrientationLabels(value)
  return labels.length > 0 ? labels : fallback
}

export function serializeDocumentOrientation(value: unknown): string | null {
  const labels = getDocumentOrientationLabels(value)
  return labels.length > 0 ? JSON.stringify(labels) : null
}
