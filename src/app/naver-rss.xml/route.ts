import { GET as baseRssGET } from '../rss.xml/route'

export const dynamic = 'force-dynamic'
export const revalidate = 3600

const CANONICAL_SITE_URL = 'https://presales.co.kr'
const NAVER_SITE_URL = 'http://www.presales.co.kr'

export async function GET() {
  const baseResponse = await baseRssGET()
  const baseXml = await baseResponse.text()
  const xml = baseXml
    .replaceAll(CANONICAL_SITE_URL, NAVER_SITE_URL)
    .replace(
      `${NAVER_SITE_URL}/rss.xml" rel="self"`,
      `${NAVER_SITE_URL}/naver-rss.xml" rel="self"`
    )

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
