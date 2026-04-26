/**
 * Claude Haiku semantic dedup. (daily-news.py.claude_dedup_groups 포팅)
 * 같은 사건/정책을 다른 매체가 보도한 경우를 그룹화.
 */
import type { NewsItem } from './dedup'

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY ?? ''
const CLAUDE_DEDUP_MODEL = process.env.CLAUDE_DEDUP_MODEL ?? 'claude-haiku-4-5-20251001'

interface ClaudeMessageResponse {
  content: { type: string; text?: string }[]
}

async function claudeGroups(items: { idx: number; title: string }[]): Promise<number[][]> {
  if (!ANTHROPIC_API_KEY || items.length === 0) return items.map((it) => [it.idx])

  const titlesBlock = items.map((it) => `${it.idx}: ${it.title}`).join('\n')
  const prompt = `아래는 수집된 한국어 뉴스 기사 제목 목록입니다. 각 제목 앞에 번호가 붙어 있습니다.

같은 사건, 같은 정책, 같은 보도자료를 다루는 기사들을 그룹으로 묶어주세요.
- 서로 다른 매체가 같은 사건/행사를 재보도하는 경우 → 같은 그룹
- 같은 회사/기관이 여러 이벤트를 주최하는 경우 → 각 이벤트별 다른 그룹
- 주제는 비슷하지만 다른 사건인 경우 → 다른 그룹

제목 목록:
${titlesBlock}

출력 형식 (반드시 JSON 만, 다른 설명 금지):
{"groups": [[1,5,7], [2], [3,4,8], ...]}

- 각 그룹은 해당 기사 번호의 리스트
- 모든 번호는 정확히 한 그룹에만 속해야 함
- 그룹 순서는 첫 등장 번호 순으로`

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_DEDUP_MODEL,
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!resp.ok) {
      console.warn(`[dedup-claude] HTTP ${resp.status}: ${(await resp.text()).slice(0, 300)}`)
      return items.map((it) => [it.idx])
    }
    const data = (await resp.json()) as ClaudeMessageResponse
    const text = data.content.filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
    const m = /\{[\s\S]*\}/.exec(text)
    if (!m) return items.map((it) => [it.idx])
    const parsed = JSON.parse(m[0]) as { groups?: unknown[] }
    const groups = (parsed.groups ?? []) as unknown[]
    const allIdx = new Set(items.map((it) => it.idx))
    const seen = new Set<number>()
    const cleaned: number[][] = []
    for (const g of groups) {
      if (!Array.isArray(g)) continue
      const valid = g.filter((x): x is number => typeof x === 'number' && allIdx.has(x))
      if (valid.length) {
        cleaned.push(valid)
        valid.forEach((v) => seen.add(v))
      }
    }
    for (const i of allIdx) if (!seen.has(i)) cleaned.push([i])
    return cleaned
  } catch (e) {
    console.warn('[dedup-claude] failed:', e)
    return items.map((it) => [it.idx])
  }
}

/** 카테고리별 뉴스 dict 를 받아서 AI dedup 후 dict 반환. 그룹 대표는 첫 번째. */
export async function aiSemanticDedup(
  byCategory: Record<string, NewsItem[]>,
): Promise<{ byCategory: Record<string, NewsItem[]>; before: number; after: number }> {
  const flat: { idx: number; cat: string; localIdx: number; title: string }[] = []
  for (const [cat, items] of Object.entries(byCategory)) {
    items.forEach((it, li) => flat.push({ idx: flat.length, cat, localIdx: li, title: it.title }))
  }
  if (flat.length === 0) return { byCategory, before: 0, after: 0 }

  const groups = await claudeGroups(flat.map((f) => ({ idx: f.idx, title: f.title })))
  const keep = new Set<number>()
  for (const g of groups) if (g.length) keep.add(g[0])

  const result: Record<string, NewsItem[]> = {}
  for (const cat of Object.keys(byCategory)) result[cat] = []
  for (const f of flat) if (keep.has(f.idx)) result[f.cat].push(byCategory[f.cat][f.localIdx])

  return { byCategory: result, before: flat.length, after: keep.size }
}
