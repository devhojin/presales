import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const FONTS_DIR = '/tmp/thumb_work/fonts';
const fontBold = readFileSync(`${FONTS_DIR}/NotoSansKR-Bold.ttf`);
const fontRegular = readFileSync(`${FONTS_DIR}/NotoSansKR-Regular.ttf`);

// Editorial palettes — subdued, intentional, varied surfaces.
// Light: ivory/stone/mint/slate/linen/sky/sand — navy-ish text, muted accent.
// Dark: navy/graphite — cream text, warm gold/brass accent.
const PALETTES_LIGHT = [
  { bg: '#FAF9F6', text: '#0F172A', sub: '#475569', label: '#6B7280', rule: '#0F172A' }, // ivory
  { bg: '#EFECE6', text: '#1F1B16', sub: '#5C5246', label: '#8A7A5C', rule: '#1F1B16' }, // stone
  { bg: '#EAF1EC', text: '#0D3321', sub: '#3F5C48', label: '#5C7A60', rule: '#0D3321' }, // mint
  { bg: '#EEF1F5', text: '#0B1E3F', sub: '#364A66', label: '#4A5B74', rule: '#0B1E3F' }, // slate
  { bg: '#F3EDE3', text: '#3A1616', sub: '#5C3A36', label: '#7A4A3A', rule: '#3A1616' }, // linen
  { bg: '#E9EEF5', text: '#0E1E2A', sub: '#2E4257', label: '#3B5A7A', rule: '#0E1E2A' }, // sky
  { bg: '#F4EFE5', text: '#171311', sub: '#4A3C32', label: '#8B5A3C', rule: '#171311' }, // sand
];

const PALETTES_DARK = [
  { bg: '#0F1E2C', text: '#F4F0E8', sub: '#C6BFB2', label: '#C8A96A', rule: '#C8A96A' }, // deep navy
  { bg: '#1A1814', text: '#EDE6D6', sub: '#C4BBAA', label: '#B59566', rule: '#B59566' }, // graphite
  { bg: '#1F2A2A', text: '#E8EDE8', sub: '#B8C4BC', label: '#9FB3A5', rule: '#9FB3A5' }, // forest-ink
];

function pickPalette(product) {
  const { id, tier } = product;
  if (tier === 'premium') {
    return PALETTES_DARK[id % PALETTES_DARK.length];
  }
  return PALETTES_LIGHT[id % PALETTES_LIGHT.length];
}

function pickLabel(product) {
  const { tier, title } = product;
  if (tier === 'premium') return '공공조달 · 프리미엄 제안서';
  if (tier === 'package') return '공공조달 · 컨설팅 패키지';
  // Heuristic by title keyword for variety
  if (/컨설팅/.test(title)) return '공공조달 · 컨설팅';
  if (/분석|리서치|시장/.test(title)) return '공공조달 · 분석 자료';
  if (/WBS|템플릿|양식/.test(title)) return '공공조달 · 템플릿';
  if (/가이드|매뉴얼|안내/.test(title)) return '공공조달 · 가이드';
  return '공공조달 · 제안서 자료';
}

function pickSubtitle(product) {
  const { tier, is_free, tags } = product;
  if (is_free) return '무료 다운로드 · 바로 실무 적용';
  if (tier === 'premium') return '수주 검증 기반 · 즉시 활용';
  if (tier === 'package') return '컨설턴트 직접 투입 · 수주 대응';
  if (Array.isArray(tags) && tags.length) {
    return tags.slice(0, 3).join(' · ');
  }
  return '실무에서 바로 쓰는 공공조달 자료';
}

function Thumbnail({ title, subtitle, label, palette }) {
  return {
    type: 'div',
    props: {
      style: {
        width: 800,
        height: 600,
        display: 'flex',
        flexDirection: 'column',
        background: palette.bg,
        fontFamily: 'Noto Sans KR',
        padding: '56px 64px',
        position: 'relative',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 14,
              color: palette.label,
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
            },
            children: label,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: 48,
              height: 2,
              background: palette.rule,
              marginTop: 28,
              marginBottom: 32,
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              fontSize: 52,
              lineHeight: 1.2,
              fontWeight: 700,
              color: palette.text,
              letterSpacing: '-0.02em',
              flexWrap: 'wrap',
            },
            children: title,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              marginTop: 'auto',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 15,
              color: palette.sub,
              fontWeight: 400,
            },
            children: [
              { type: 'div', props: { style: { display: 'flex' }, children: subtitle } },
              {
                type: 'div',
                props: {
                  style: { display: 'flex', fontWeight: 700, color: palette.text, letterSpacing: '0.14em' },
                  children: 'PRESALES',
                },
              },
            ],
          },
        },
      ],
    },
  };
}

async function renderOne({ title, subtitle, label, palette, outPath }) {
  const svg = await satori(Thumbnail({ title, subtitle, label, palette }), {
    width: 800,
    height: 600,
    fonts: [
      { name: 'Noto Sans KR', data: fontRegular, weight: 400, style: 'normal' },
      { name: 'Noto Sans KR', data: fontBold, weight: 700, style: 'normal' },
    ],
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 800 } });
  const png = resvg.render().asPng();
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, png);
  return png.length;
}

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.split('=');
    return [k.replace(/^--/, ''), v.join('=')];
  }),
);

async function main() {
  if (args.batch) {
    const productsPath = resolve(args.batch);
    const outDir = resolve(args.outdir ?? './public/thumbnails');
    const products = JSON.parse(readFileSync(productsPath, 'utf8'));
    const results = [];
    for (const p of products) {
      const palette = pickPalette(p);
      const label = pickLabel(p);
      const subtitle = pickSubtitle(p);
      const outPath = `${outDir}/product-${p.id}.png`;
      const bytes = await renderOne({ title: p.title, subtitle, label, palette, outPath });
      results.push({ id: p.id, bytes, outPath });
      process.stdout.write(`${p.id}:${bytes} `);
    }
    console.log(`\n[ok] rendered ${results.length} files to ${outDir}`);
    return;
  }

  // single mode (prototype / debug)
  const title = args.title ?? '개인정보보호법 적용사례 시나리오 100건';
  const subtitle = args.subtitle ?? '실무에서 바로 쓰는 공공조달 제안서 자료';
  const label = args.label ?? '공공조달 · 제안서 자료';
  const paletteIndex = parseInt(args.palette ?? '0', 10);
  const palette = (args.dark === '1' ? PALETTES_DARK : PALETTES_LIGHT)[paletteIndex % (args.dark === '1' ? PALETTES_DARK.length : PALETTES_LIGHT.length)];
  const out = args.out ?? '/tmp/thumb_work/out/prototype.png';
  const bytes = await renderOne({ title, subtitle, label, palette, outPath: out });
  console.log('wrote', out, bytes, 'bytes');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
