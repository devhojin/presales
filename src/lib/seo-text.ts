const HTML_TAG_RE = /<[^>]*>/g
const SCRIPT_STYLE_RE = /<(script|style)[\s\S]*?<\/\1>/gi

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

export function stripHtml(value: string | null | undefined): string {
  if (!value) return ''
  return decodeHtmlEntities(value.replace(SCRIPT_STYLE_RE, ' ').replace(HTML_TAG_RE, ' '))
}

export function normalizeSeoText(value: string | null | undefined): string {
  return stripHtml(value).replace(/\s+/g, ' ').trim()
}

export function truncateSeoText(value: string | null | undefined, maxLength = 155): string {
  const text = normalizeSeoText(value)
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}…`
}
