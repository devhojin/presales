/**
 * documento vs presales 상품 매핑 및 차이점 비교
 */
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'scripts', 'crawl-output');

// Load documento data
const docProducts = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'documento-products-v3.json'), 'utf8'));
// Load v1 data for thumbnail URLs (v1 has cdn-optimized URLs)
const docV1 = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'documento-products.json'), 'utf8'));

// Merge thumbnail URLs from v1 where v3 didn't get them
const v1Map = {};
docV1.forEach(p => { v1Map[p.idx] = p; });

// Build documento map by idx
const docMap = {};
docProducts.forEach(p => {
  docMap[p.idx] = p;
  // Use v1 thumbnail if available (has full CDN URL)
  if (v1Map[p.idx]?.thumbnailUrl) {
    p.thumbnailUrlCdn = v1Map[p.idx].thumbnailUrl;
  }
});

// Define the mapping: documento idx -> presales id
// Based on title matching analysis
const MAPPING = {
  // 유료 상품 매핑
  92: { presalesId: 19, note: '30억 시스템구축 PPT' },
  104: { presalesId: 19, note: '30억 시스템구축 PDF (중복)' },
  190: { presalesId: 40, note: '45억 가로형 PPT' },
  191: { presalesId: 40, note: '45억 가로형 고퀄 PDF (중복)' },
  194: { presalesId: 41, note: '45억 세로형 PPT' },
  195: { presalesId: 41, note: '45억 세로형 고퀄 PDF (중복)' },
  134: { presalesId: 29, note: '청해시 홈페이지 유지보수 PPT' },
  135: { presalesId: 30, note: '청해시 홈페이지 유지보수 PDF' },
  116: { presalesId: 27, note: 'IoT 빌딩 관제 (군부대 IoT)' },
  130: { presalesId: 24, note: 'IoT 빌딩 관제 PDF (유료버전)' },
  175: { presalesId: 37, note: '27억 정보보안 업무관리 PDF' },
  174: { presalesId: 37, note: '27억 정보보안 업무관리 PPT (중복)' },
  186: { presalesId: 39, note: '화영시 포털사이트 PDF' },
  185: { presalesId: 39, note: '화영시 포털사이트 PPT (중복)' },
  184: { presalesId: 38, note: '농산물 물류 시스템 PDF' },
  183: { presalesId: 38, note: '농산물 물류 시스템 PPT (중복)' },
  101: { presalesId: 25, note: '유지보수 제안서 PDF' },
  98: { presalesId: 25, note: '유지보수 제안서 PPT (중복)' },
  163: { presalesId: 35, note: '디자인DB 구축 제안서' },
  162: { presalesId: 35, note: '디자인DB PPT (중복)' },
  166: { presalesId: 36, note: '교육플랫폼 PDF' },
  165: { presalesId: 36, note: '교육플랫폼 PPT (중복)' },
  152: { presalesId: 32, note: '민간웹사이트 운영관리 PDF (악성코드 조치)' },
  151: { presalesId: 32, note: '민간웹사이트 운영관리 PPT (중복)' },
  157: { presalesId: 58, note: '상품이력제 정보시스템 PDF' },
  156: { presalesId: 58, note: '상품이력제 정보시스템 PPT (중복)' },
  132: { presalesId: 26, note: '온라인 채용관리 PDF' },
  108: { presalesId: 26, note: '온라인 채용관리 PPT (중복)' },
  96: { presalesId: 23, note: '홈쇼핑 BM/차세대 PDF' },
  102: { presalesId: 23, note: '홈쇼핑 BM/차세대 PPT (중복)' },
  145: { presalesId: 45, note: '예비창업패키지 사업계획서' },
  93: { presalesId: 20, note: '안전플랫폼 MMI 화면설계서' },
  136: { presalesId: 31, note: 'UI/UX 설계 기획서' },
  159: { presalesId: 46, note: 'SLA 서비스품질관리' },
  155: { presalesId: 34, note: '광고플랫폼 스토리보드' },
  200: { presalesId: 43, note: 'ISP 통합전산망 구축' },
  91: { presalesId: 6, note: '건설현장 공종분류 (비공개)' },
  94: { presalesId: 21, note: '노션 영업관리 (비공개)' },
  133: { presalesId: 28, note: '서비스정책서 PDF' },
  131: { presalesId: 8, note: '서비스정책서 무료' },
  169: { presalesId: 49, note: '프로젝트 수행계획서' },

  // 무료 상품 매핑
  171: { presalesId: null, note: 'WBS 엑셀 - presales에서 무료로 존재 가능' },
  158: { presalesId: 55, note: '특허청 SW개발방법론' },
  143: { presalesId: 9, note: '데이터전환 계획서' },
  142: { presalesId: 14, note: '요구사항 추적표' },
  150: { presalesId: 7, note: '기능명세서/기능정의서' },
  141: { presalesId: 11, note: '문서관리 지침서' },
  140: { presalesId: 12, note: '업무 변경 요청서' },
  139: { presalesId: 10, note: '디바이스 배포 프로세스' },
  121: { presalesId: 5, note: '개인정보보호법 시나리오 100건' },
  95: { presalesId: 16, note: '프로젝트 산출물 템플릿' },
  99: { presalesId: 2, note: '3개년 수주 ARPU' },
  129: { presalesId: 15, note: '통합테스트 시나리오 (비공개)' },
  97: { presalesId: 3, note: 'IoT 서버 디바이스 연동 시나리오' },
  103: { presalesId: 4, note: 'WBS PPT' },
  138: { presalesId: 17, note: '프로젝트 평가서' },
  196: { presalesId: 59, note: '공공정보화 제안요청서 작성가이드' },
  193: { presalesId: 53, note: '제안서 목차 (2024)' },
  192: { presalesId: 51, note: '우선협상대상자 기술협상' },
  197: { presalesId: 54, note: '투찰가 지분율 계산기' },
  182: { presalesId: 56, note: '프로그램 목록' },
  181: { presalesId: 13, note: 'ERD 설계문서' },
  180: { presalesId: 50, note: '엔티티정의서' },
  173: { presalesId: 48, note: 'MOU 양해각서' },
  170: { presalesId: 57, note: 'IA 구조도' },
  154: { presalesId: 33, note: '사업비 비목 산출표' },
  168: { presalesId: 52, note: '제안서 목차' },
  146: { presalesId: null, note: '메타버스 분석자료 - presales에 없음' },
  187: { presalesId: null, note: '무료 템플릿 다운로드 랜딩' },

  // 서비스/비공개
  113: { presalesId: null, note: '제안서 작성 지원 비상주 (서비스)' },
  178: { presalesId: null, note: '제안서 작성 지원 상주 (서비스)' },
  114: { presalesId: null, note: '비공개 상품' },
};

// Generate comparison report
console.log('\n' + '='.repeat(80));
console.log('DOCUMENTO → PRESALES 상품 매핑 & 차이점 분석');
console.log('='.repeat(80));

// 1. Mapped products - title comparison
console.log('\n\n## 1. 제목 차이 (documento → presales 매핑된 상품)\n');
console.log('| doc idx | documento 제목 | presales id | presales 제목 (DB) | 가격 차이 |');
console.log('|---------|---------------|-------------|-------------------|-----------|');

const titleDiffs = [];
const priceDiffs = [];

Object.entries(MAPPING).forEach(([docIdx, mapping]) => {
  const doc = docMap[parseInt(docIdx)];
  if (!doc || !mapping.presalesId) return;

  const docTitle = doc.title || '(no title)';
  const docPrice = doc.price;

  // We'll note the mapping for comparison
  console.log(`| ${docIdx} | ${docTitle.substring(0, 40)} | ${mapping.presalesId} | (DB 조회 필요) | doc: ₩${docPrice?.toLocaleString() || 'N/A'} |`);
});

// 2. Unmapped documento products
console.log('\n\n## 2. presales에 매핑되지 않은 documento 상품\n');
const unmapped = Object.entries(MAPPING).filter(([_, m]) => m.presalesId === null);
unmapped.forEach(([idx, m]) => {
  const doc = docMap[parseInt(idx)];
  console.log(`- idx=${idx}: "${doc?.title}" (₩${doc?.price?.toLocaleString() || 'N/A'}) — ${m.note}`);
});

// 3. documento 중복 상품 정리
console.log('\n\n## 3. documento 중복 상품 (같은 presales 상품에 매핑)\n');
const presalesGroups = {};
Object.entries(MAPPING).forEach(([docIdx, m]) => {
  if (m.presalesId) {
    if (!presalesGroups[m.presalesId]) presalesGroups[m.presalesId] = [];
    presalesGroups[m.presalesId].push({ docIdx: parseInt(docIdx), ...m, doc: docMap[parseInt(docIdx)] });
  }
});

Object.entries(presalesGroups)
  .filter(([_, items]) => items.length > 1)
  .forEach(([presId, items]) => {
    console.log(`\npresales #${presId}:`);
    items.forEach(item => {
      const p = item.doc;
      console.log(`  - doc idx=${item.docIdx}: "${p?.title?.substring(0, 50)}" | ₩${p?.price?.toLocaleString() || 'N/A'} | ${item.note}`);
    });
  });

// 4. documento 가격 정리 (무료=0원인 상품)
console.log('\n\n## 4. documento 무료 상품 (price=0)\n');
docProducts.filter(p => p.price === 0).forEach(p => {
  const mapped = MAPPING[p.idx];
  console.log(`- idx=${p.idx}: "${p.title}" → presales #${mapped?.presalesId || 'UNMAPPED'}`);
});

// 5. documento 유료 상품 가격 정리
console.log('\n\n## 5. documento 유료 상품 가격\n');
console.log('| doc idx | 제목 | documento 가격 | presales id |');
console.log('|---------|------|---------------|------------|');
docProducts.filter(p => p.price > 0 && p.price < 1000000).sort((a, b) => a.price - b.price).forEach(p => {
  const mapped = MAPPING[p.idx];
  console.log(`| ${p.idx} | ${p.title?.substring(0, 40)} | ₩${p.price?.toLocaleString()} | ${mapped?.presalesId || 'UNMAPPED'} |`);
});

// 6. Thumbnail comparison summary
console.log('\n\n## 6. 썸네일 이미지 다운로드 현황\n');
const thumbDir = path.join(OUTPUT_DIR, 'thumbnails');
const downloaded = fs.readdirSync(thumbDir);
console.log(`다운로드 완료: ${downloaded.length}개`);
console.log(`presales 기존 썸네일: ~/presales/public/thumbnails/ (59개)`);

// 7. Summary of what needs to happen
console.log('\n\n## 7. 작업 요약\n');
console.log('### 썸네일 교체 필요 상품:');
console.log('모든 매핑된 상품의 documento 썸네일 → presales 교체 검토 필요');
console.log(`총 매핑된 상품 수: ${Object.values(MAPPING).filter(m => m.presalesId).length}개`);

console.log('\n### 설명 교체 필요 상품:');
console.log('documento에서 추출한 설명(description)을 presales DB에 반영 필요');
const withGoodDesc = docProducts.filter(p => p.description && p.description.length > 100);
console.log(`설명이 충분한 상품: ${withGoodDesc.length}개 (100자 이상)`);
const shortDesc = docProducts.filter(p => p.description && p.description.length <= 100 && p.description.length > 0);
console.log(`설명이 짧은 상품: ${shortDesc.length}개 (100자 이하)`);

// Save the mapping as JSON for use in update script
const mappingOutput = [];
Object.entries(MAPPING).forEach(([docIdx, m]) => {
  if (!m.presalesId) return;
  const doc = docMap[parseInt(docIdx)];
  mappingOutput.push({
    docIdx: parseInt(docIdx),
    presalesId: m.presalesId,
    docTitle: doc?.title,
    docPrice: doc?.price,
    docDescription: doc?.description,
    docDescriptionHtml: doc?.descriptionHtml,
    docThumbnailUrl: doc?.thumbnailUrl,
    docThumbnailCdn: doc?.thumbnailUrlCdn,
    localThumbnail: `documento-${docIdx}.png`,
    note: m.note,
  });
});

fs.writeFileSync(
  path.join(OUTPUT_DIR, 'mapping.json'),
  JSON.stringify(mappingOutput, null, 2), 'utf8'
);
console.log(`\n✅ 매핑 데이터 저장: scripts/crawl-output/mapping.json (${mappingOutput.length}건)`);
