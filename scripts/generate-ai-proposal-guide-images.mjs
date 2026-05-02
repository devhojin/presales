import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const outputDir = path.join(process.cwd(), 'public/images/ai-proposal-guide')
const coverDir = path.join(outputDir, 'covers')

const guides = [
  ['rfp-origin', 'RFP 발생 흐름', ['발주계획', '사전규격', '본공고', '제안준비'], '#111827', '#f5c76b'],
  ['narajangteo-notice-check', '공고 판독 우선순위', ['참가자격', '마감', '평가', '제출물'], '#1e40af', '#bfdbfe'],
  ['chatgpt-rfp-analysis', 'RFP 초벌 분석', ['과업범위', '요구사항', '리스크', '질의후보'], '#7c2d12', '#fed7aa'],
  ['requirements-response-table', '요구사항 대응표', ['요구사항', '목차', '증빙', '검수상태'], '#047857', '#bbf7d0'],
  ['proposal-strategy-message', '제안 전략 메시지', ['문제정의', '차별점', '근거', '요약문'], '#be123c', '#fecdd3'],
  ['proposal-outline', '제안서 목차 설계', ['정량', '정성', '요약서', '발표자료'], '#8b5e34', '#fde68a'],
  ['ai-draft-writing', '본문 초안 작성', ['초안', '근거확인', '삭제', '수정'], '#4c1d95', '#ddd6fe'],
  ['proposal-visuals', '제안서 이미지 제작', ['표지', '개념도', '프로세스', '캡션'], '#334155', '#d9f99d'],
  ['codex-document-operations', 'Codex 자료 정리', ['파일목록', '체크리스트', '표준화', '누락탐지'], '#0f172a', '#67e8f9'],
  ['consortium-role-split', '컨소시엄 역할 분담', ['참여사', '역할', '지분율', '증빙'], '#1d4ed8', '#bfdbfe'],
  ['final-review', '제출 전 검수', ['PDF', '파일명', '증빙', '가격서'], '#7f1d1d', '#fecaca'],
  ['narajangteo-submission', '나라장터 제출 확인', ['업로드', '접수번호', '확인서', '이후대응'], '#065f46', '#a7f3d0'],
]

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function card(label, x, y, index, accent) {
  return `
    <g filter="url(#shadow)">
      <rect x="${x}" y="${y}" width="190" height="114" rx="20" fill="rgba(255,255,255,0.94)" stroke="rgba(15,23,42,0.14)" />
      <circle cx="${x + 38}" cy="${y + 38}" r="18" fill="${accent}" opacity="0.95" />
      <text x="${x + 38}" y="${y + 44}" text-anchor="middle" font-size="15" font-weight="800" fill="#111827">${index}</text>
      <text x="${x + 66}" y="${y + 48}" font-size="22" font-weight="800" fill="#111827">${escapeXml(label)}</text>
      <rect x="${x + 26}" y="${y + 75}" width="138" height="8" rx="4" fill="#e5e7eb" />
      <rect x="${x + 26}" y="${y + 92}" width="96" height="8" rx="4" fill="#f1f5f9" />
    </g>
  `
}

function svgFor([slug, title, steps, bg, accent]) {
  const arrows = [286, 526, 766].map((x) => `
    <path d="M${x} 384h54" stroke="${accent}" stroke-width="7" stroke-linecap="round" opacity="0.9"/>
    <path d="M${x + 42} 368l22 16-22 16" fill="none" stroke="${accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
  `).join('')

  return `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="760" viewBox="0 0 1200 760">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-30%" width="140%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#020617" flood-opacity="0.18"/>
    </filter>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M42 0H0V42" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1200" height="760" fill="url(#bg)"/>
  <rect width="1200" height="760" fill="url(#grid)"/>
  <circle cx="1010" cy="145" r="180" fill="${accent}" opacity="0.13"/>
  <circle cx="210" cy="660" r="230" fill="${accent}" opacity="0.08"/>
  <text x="86" y="105" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="22" font-weight="800" fill="${accent}" letter-spacing="6">AI PROPOSAL GUIDE</text>
  <text x="86" y="170" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="54" font-weight="900" fill="#ffffff">${escapeXml(title)}</text>
  <text x="86" y="220" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="600" fill="rgba(255,255,255,0.72)">ChatGPT · 이미지 생성 · Codex로 제안서 작업을 구조화하는 실무 시각자료</text>
  <g transform="translate(86 315)">
    ${card(steps[0], 0, 0, '01', accent)}
    ${card(steps[1], 240, 0, '02', accent)}
    ${card(steps[2], 480, 0, '03', accent)}
    ${card(steps[3], 720, 0, '04', accent)}
    ${arrows}
  </g>
  <rect x="86" y="582" width="1028" height="86" rx="24" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.16)"/>
  <text x="128" y="635" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="800" fill="#ffffff">핵심: AI는 초안을 빠르게 만들고, 사람은 원문·근거·제출조건을 최종 검수합니다.</text>
</svg>`
}

function coverSvgFor([slug, title, steps, bg, accent]) {
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-30%" width="140%" height="160%">
      <feDropShadow dx="0" dy="18" stdDeviation="20" flood-color="#020617" flood-opacity="0.22"/>
    </filter>
    <pattern id="grid" width="38" height="38" patternUnits="userSpaceOnUse">
      <path d="M38 0H0V38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)"/>
  <rect width="900" height="1200" fill="url(#grid)"/>
  <rect x="0" y="0" width="900" height="12" fill="${accent}"/>
  <circle cx="760" cy="250" r="178" fill="${accent}" opacity="0.12"/>
  <circle cx="148" cy="960" r="230" fill="${accent}" opacity="0.1"/>
  <text x="76" y="110" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="18" font-weight="800" fill="${accent}" letter-spacing="7">AI PROPOSAL GUIDE</text>
  <text x="76" y="185" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="64" font-weight="900" fill="#ffffff">${escapeXml(title)}</text>
  <text x="76" y="244" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="600" fill="rgba(255,255,255,0.72)">ChatGPT · 이미지 생성 · Codex</text>
  <g filter="url(#shadow)">
    <rect x="76" y="355" width="748" height="438" rx="34" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
    <rect x="122" y="412" width="296" height="104" rx="24" fill="rgba(255,255,255,0.92)"/>
    <rect x="482" y="412" width="296" height="104" rx="24" fill="rgba(255,255,255,0.92)"/>
    <rect x="122" y="575" width="296" height="104" rx="24" fill="rgba(255,255,255,0.92)"/>
    <rect x="482" y="575" width="296" height="104" rx="24" fill="rgba(255,255,255,0.92)"/>
    <text x="154" y="474" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="900" fill="#111827">01</text>
    <text x="202" y="474" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="28" font-weight="800" fill="#111827">${escapeXml(steps[0])}</text>
    <text x="514" y="474" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="900" fill="#111827">02</text>
    <text x="562" y="474" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="28" font-weight="800" fill="#111827">${escapeXml(steps[1])}</text>
    <text x="154" y="637" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="900" fill="#111827">03</text>
    <text x="202" y="637" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="28" font-weight="800" fill="#111827">${escapeXml(steps[2])}</text>
    <text x="514" y="637" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="24" font-weight="900" fill="#111827">04</text>
    <text x="562" y="637" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="28" font-weight="800" fill="#111827">${escapeXml(steps[3])}</text>
  </g>
  <rect x="76" y="900" width="748" height="126" rx="32" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.18)"/>
  <text x="122" y="956" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="25" font-weight="900" fill="#ffffff">AI는 초안을 빠르게 만들고,</text>
  <text x="122" y="1000" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="25" font-weight="900" fill="#ffffff">사람은 원문·근거·제출조건을 최종 검수합니다.</text>
  <text x="76" y="1100" font-family="Noto Sans KR, Apple SD Gothic Neo, Arial, sans-serif" font-size="20" font-weight="800" fill="${accent}">${escapeXml(slug)}</text>
</svg>`
}

await fs.mkdir(outputDir, { recursive: true })
await fs.mkdir(coverDir, { recursive: true })

for (const guide of guides) {
  const [slug] = guide
  const svg = svgFor(guide)
  const coverSvg = coverSvgFor(guide)
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(path.join(outputDir, `${slug}.webp`))
  await sharp(Buffer.from(coverSvg)).webp({ quality: 88 }).toFile(path.join(coverDir, `${slug}.webp`))
}

console.log(`Generated ${guides.length} AI proposal guide image sets in ${outputDir}`)
