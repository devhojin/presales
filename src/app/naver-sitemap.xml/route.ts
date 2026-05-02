import sitemap from '../sitemap'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const CANONICAL_SITE_URL = 'https://presales.co.kr'
const NAVER_SITE_URL = 'https://www.presales.co.kr'

function escapeXml(value: string | number | Date | null | undefined): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function formatLastModified(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString()
  if (value instanceof Date) return value.toISOString()
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString()
}

export async function GET() {
  const entries = await sitemap()
  const urls = entries
    .filter((entry) => entry.url.startsWith(CANONICAL_SITE_URL))
    .map((entry) => ({
      ...entry,
      url: entry.url.replace(CANONICAL_SITE_URL, NAVER_SITE_URL),
    }))

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>
    <loc>${escapeXml(entry.url)}</loc>
    <lastmod>${escapeXml(formatLastModified(entry.lastModified))}</lastmod>
    ${entry.changeFrequency ? `<changefreq>${escapeXml(entry.changeFrequency)}</changefreq>` : ''}
    ${entry.priority !== undefined ? `<priority>${escapeXml(entry.priority)}</priority>` : ''}
  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
