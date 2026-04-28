export interface ProductSearchSource {
  title?: string | null
  description?: string | null
  tags?: string[] | null
}

export function normalizeProductSearchTerm(value: string): string {
  return value.trim().replace(/^#+/, '').trim().toLocaleLowerCase('ko-KR')
}

export function normalizeProductTags(tags: string[] | null | undefined): string[] {
  if (!Array.isArray(tags)) return []

  const seen = new Set<string>()
  const result: string[] = []

  for (const rawTag of tags) {
    if (typeof rawTag !== 'string') continue
    const tag = rawTag.trim().replace(/^#+/, '').trim()
    const key = tag.toLocaleLowerCase('ko-KR')
    if (!tag || seen.has(key)) continue
    seen.add(key)
    result.push(tag)
  }

  return result
}

export function productMatchesSearch(product: ProductSearchSource, rawQuery: string): boolean {
  const query = normalizeProductSearchTerm(rawQuery)
  if (!query) return true

  const title = (product.title ?? '').toLocaleLowerCase('ko-KR')
  const description = (product.description ?? '').toLocaleLowerCase('ko-KR')
  if (title.includes(query) || description.includes(query)) return true

  return normalizeProductTags(product.tags).some((tag) =>
    tag.toLocaleLowerCase('ko-KR').includes(query)
  )
}

export function buildProductTagSearchHref(tag: string): string {
  const query = normalizeProductSearchTerm(tag)
  return query ? `/store?q=${encodeURIComponent(query)}` : '/store'
}
