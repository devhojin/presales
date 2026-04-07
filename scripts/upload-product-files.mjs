/**
 * upload-product-files.mjs
 * Supabase Storage product-files 버킷에 상품 파일 업로드 후
 * product_files 테이블에 등록하는 스크립트
 *
 * supabase-js 클라이언트가 한글 파일명을 내부에서 디코딩하여 Invalid key 오류가 발생하므로
 * Storage API는 fetch()로 직접 호출, DB INSERT는 supabase-js 사용
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── 환경변수 로드 (.env.local) ────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  env[key] = value;
}

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];
const BUCKET = 'product-files';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// DB 작업만 supabase-js 사용
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ─── 파일 베이스 경로 ─────────────────────────────────────────────────────
const BASE_PATH = 'C:\\Users\\hojin\\Dropbox\\Project_documents\\documents_presales';

// ─── MIME 타입 추론 ───────────────────────────────────────────────────────
function getMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  const map = {
    '.pdf': 'application/pdf',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.xls': 'application/vnd.ms-excel',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.doc': 'application/msword',
    '.hwp': 'application/x-hwp',
    '.zip': 'application/zip',
  };
  return map[ext] || 'application/octet-stream';
}

// ─── Storage 직접 업로드 (fetch API) ─────────────────────────────────────
// supabase-js는 한글 파일명을 내부에서 디코딩하여 Invalid key를 발생시킴
// 따라서 fetch를 직접 사용하여 인코딩된 URL로 업로드
async function uploadToStorage(productId, fileName, fileBuffer, contentType) {
  // Storage 경로: products/{productId}/{인코딩된파일명}
  const encodedFileName = encodeURIComponent(fileName);
  const objectPath = `products/${productId}/${encodedFileName}`;

  // Supabase Storage REST API: PUT /storage/v1/object/{bucket}/{path}
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${objectPath}`;

  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
    },
    body: fileBuffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text}`);
  }

  // public URL 형식으로 반환 (버킷이 private이어도 URL 패턴은 동일)
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${objectPath}`;
  return { objectPath, publicUrl };
}

// ─── 상품-파일 매핑 ───────────────────────────────────────────────────────
// [product_id, 폴더, 파일명]
const FILE_MAPPINGS = [
  // 기존 상품
  [2,  '06_사업계획서', 'ARPU___.xlsx'],
  [3,  '07_무료_산출물템플릿', 'IoT_solution____.pptx'],
  [4,  '07_무료_산출물템플릿', 'WBS_ppt.pptx'],
  [4,  '07_무료_산출물템플릿', 'WBS.xls'],
  [5,  '07_무료_산출물템플릿', '개인정보보호법_적용사례_상황별_맞춤_서비스_시나리오(100건).pdf'],
  [7,  '07_무료_산출물템플릿', '기능_및_기술요건_정의서.docx'],
  [8,  '02_기술제안서_PDF',    '__v1.0.pdf'],
  [9,  '07_무료_산출물템플릿', '데이터전환계획서.doc'],
  [10, '07_무료_산출물템플릿', 'Device.pptx'],
  [11, '07_무료_산출물템플릿', 'PMO_.doc'],
  [12, '07_무료_산출물템플릿', '_.docx'],
  [13, '07_무료_산출물템플릿', '(ERD).ppt'],
  [14, '07_무료_산출물템플릿', '___V1.0.xls'],
  [16, '07_무료_산출물템플릿', '__.zip'],
  [17, '07_무료_산출물템플릿', '_ (1).xlsx'],
  [19, '01_기술제안서_PPT',    '나라장터_입찰_제안서-시스템_구축부문_(30억_규모).zip'],
  [20, '01_기술제안서_PPT',    '00.IoT_Solution_Monitor_MMI_v1.0.pptx'],
  [23, '01_기술제안서_PPT',    '[Shopping_mall_BM]Proposal_ver1.0.pptx'],
  [23, '02_기술제안서_PDF',    '[Shopping_mall_BM]Proposal_ver1.0.pdf'],
  [24, '02_기술제안서_PDF',    '[]_IoT_ooo_oooooo____1.2_full.pdf'],
  [25, '01_기술제안서_PPT',    '제안서_ooooo_월_1억매출_금융재단_업무시스템_통합유지보수_컬러.pptx'],
  [27, '01_기술제안서_PPT',    'IoT_기반_장비_시설물_원격감시체계_구축사업_2.0.zip'],
  [27, '02_기술제안서_PDF',    'IoT_기반_장비_시설물_원격감시체계_구축사업_2.0_PDF.zip'],
  [28, '01_기술제안서_PPT',    '대형쇼핑몰사이트서비스정책서_통합본_1.1.docx'],
  [28, '02_기술제안서_PDF',    '대형쇼핑몰사이트서비스정책서_통합본_1.1.pdf'],
  [29, '01_기술제안서_PPT',    '______1.0.pptx'],
  [29, '02_기술제안서_PDF',    '______1.0.pdf'],
  [30, '01_기술제안서_PPT',    '청해시_홈페이지_통합_유지보수_및_고도화_제안서.zip'],
  [30, '01_기술제안서_PPT',    '청해시_홈페이지_통합_유지보수_및_고도화_제안서_1.0.zip'],
  [31, '04_발표자료',          'xxx___Service_User_Interface_.pptx'],
  [32, '01_기술제안서_PPT',    '악성코드_은닉사이트_조치_및_기술지원_용역.zip'],
  [32, '02_기술제안서_PDF',    'pdf_악성코드_은닉사이트_조치_및_기술지원_용역.zip'],
  [33, '05_가격제안',          '사업비_세부내역_산출(비목_산출표).zip'],
  [34, '04_발표자료',          '155_광고플랫폼_스토리보드.zip'],
  [35, '01_기술제안서_PPT',    '박물관_산업활용_디자인DB_구축_1.0.pptx'],
  [35, '02_기술제안서_PDF',    '박물관_산업활용_디자인DB_구축_1.0.pdf'],
  [36, '01_기술제안서_PPT',    '네트워크_보안_인력_양성_교육플랫폼_구축_및_운영_제안_1.0.pptx'],
  [36, '02_기술제안서_PDF',    '네트워크_보안_인력_양성_교육플랫폼_구축_및_운영_제안_1.0.pdf'],
  [37, '01_기술제안서_PPT',    '정보보안_업무관리_시스템_구축-제안서_1.0.pptx'],
  [37, '02_기술제안서_PDF',    '정보보안_업무관리_시스템_구축-제안서_1.0.pdf'],
  [38, '01_기술제안서_PPT',    '농산물_물류_추적_및_관리_시스템_구축과_유지보수_용역_1.0.pptx'],
  [38, '02_기술제안서_PDF',    '농산물_물류_추적_및_관리_시스템_구축과_유지보수_용역_1.0.pdf'],
  [39, '01_기술제안서_PPT',    '1._화영시_여객서비스_입주기업_지원_포털사이트_제안서.zip'],
  [39, '02_기술제안서_PDF',    '화영시_여객서비스_입주기업_지원_포털사이트_제안서_pdf.zip'],
  [40, '01_기술제안서_PPT',    '[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip'],
  [40, '02_기술제안서_PDF',    'pdf_[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip'],
  [40, '02_기술제안서_PDF',    'pdf_IoT활용_에너지_효율_관리_시스템_구축.zip'],
  [40, '01_기술제안서_PPT',    'A3_가로제안서_떡제본(무선제본)_202405.pptx'],
  [41, '01_기술제안서_PPT',    '세로_45억_규모_공공_제안서_시스템_구축부문.zip'],
  [43, '01_기술제안서_PPT',    'ISP_통합전산망_구축_정보화_전략계획.zip'],
  // 44는 59와 동일 파일이므로 스킵
  [45, '06_사업계획서',        '맥동_인공지능_허준_사업계획서_창업지원_예비창업패키지.zip'],
  // 신규 상품 46~59
  [46, '01_기술제안서_PPT',    'SLA_서비스품질관리_부문제안서_1.0_A4.pptx'],
  [47, '04_발표자료',          'XX학원_LMS_분석설계.pptx'],
  [48, '03_입찰가이드',        'MOU양식.doc'],
  [49, '03_입찰가이드',        '수행계획서_MSword.docx'],
  [50, '07_무료_산출물템플릿', '엔티티정의서.zip'],
  [51, '03_입찰가이드',        '우선협상대상자_기술협상안(안).hwp'],
  [52, '03_입찰가이드',        '제안목차_참조.xls'],
  [53, '03_입찰가이드',        '제안서_목차_템플릿(2024).xlsx'],
  [54, '05_가격제안',          '투찰가_산정_지분율_계산.xlsx'],
  [55, '03_입찰가이드',        '특허청_소프트웨어(SW)_개발방법론.pdf'],
  [56, '07_무료_산출물템플릿', '프로그램목록-V1.0.xlsx'],
  [57, '04_발표자료',          '프로젝트명_IA_Document_기획.xlsx'],
  [58, '01_기술제안서_PPT',    '상품이력제_정보시스템_구욱_용역_사업_1.0.pptx'],
  [58, '02_기술제안서_PDF',    '상품이력제_정보시스템_구욱_용역_사업_1.0.pdf'],
  [59, '03_입찰가이드',        '제안요청서작성가이드(2024).zip'],
];

// ─── 파일 크기 포맷 ───────────────────────────────────────────────────────
function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Storage 경로 안전 변환 (한글/특수문자 → 영문 ID) ────────────────────
function sanitizeStoragePath(productId, fileName, index) {
  const ext = path.extname(fileName).toLowerCase();
  return `products/${productId}/file_${index}${ext}`;
}

// ─── 메인 ─────────────────────────────────────────────────────────────────
async function main() {
  console.log('=== Supabase 상품 파일 업로드 시작 ===\n');

  // 기존 product_files 레코드 조회 (중복 방지)
  const { data: existingFiles, error: fetchErr } = await supabase
    .from('product_files')
    .select('product_id, file_name');

  if (fetchErr) {
    console.error('product_files 조회 실패:', fetchErr.message);
    process.exit(1);
  }

  const existingSet = new Set(
    existingFiles.map(r => `${r.product_id}__${r.file_name}`)
  );
  console.log(`기존 등록 파일: ${existingFiles.length}개\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (let i = 0; i < FILE_MAPPINGS.length; i++) {
    const [productId, folder, fileName] = FILE_MAPPINGS[i];
    const key = `${productId}__${fileName}`;

    // 중복 체크
    if (existingSet.has(key)) {
      console.log(`[${i + 1}/${FILE_MAPPINGS.length}] SKIP (이미 등록됨) product_id=${productId} | ${fileName}`);
      skipCount++;
      continue;
    }

    const localPath = path.join(BASE_PATH, folder, fileName);

    // 파일 존재 확인
    if (!fs.existsSync(localPath)) {
      console.log(`[${i + 1}/${FILE_MAPPINGS.length}] NOT FOUND: ${localPath}`);
      errorCount++;
      continue;
    }

    const stat = fs.statSync(localPath);
    const fileSizeBytes = stat.size;
    const fileSizeStr = formatFileSize(fileSizeBytes);
    const contentType = getMimeType(fileName);

    console.log(`[${i + 1}/${FILE_MAPPINGS.length}] UPLOAD product_id=${productId} | ${fileName} (${fileSizeStr})`);

    try {
      // 파일 읽기
      const fileBuffer = fs.readFileSync(localPath);

      // Storage 경로: 영문 ID 기반 (한글 파일명 문제 회피)
      const storagePath = sanitizeStoragePath(productId, fileName, i);

      // Storage 업로드
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('product-files')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (uploadErr) {
        console.error(`    ❌ Storage 업로드 실패: ${uploadErr.message}`);
        errorCount++;
        continue;
      }

      // Public URL 생성 (private 버킷이지만 URL 형식은 필요)
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/product-files/${storagePath}`;

      // product_files 테이블 INSERT (file_name은 원본 한글 유지)
      const { error: insertErr } = await supabase
        .from('product_files')
        .insert({
          product_id: productId,
          file_name: fileName,
          file_url: publicUrl,
          file_size: fileSizeStr,
        });

      if (insertErr) {
        console.error(`    ❌ DB INSERT 실패: ${insertErr.message}`);
        errorCount++;
        continue;
      }

      console.log(`    ✅ ${storagePath}`);
      existingSet.add(key);
      successCount++;

    } catch (err) {
      console.error(`    ERROR: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n=== 업로드 완료 ===');
  console.log(`성공: ${successCount}개`);
  console.log(`스킵: ${skipCount}개`);
  console.log(`오류: ${errorCount}개`);
  console.log(`합계: ${FILE_MAPPINGS.length}개`);
}

main().catch(err => {
  console.error('치명적 오류:', err);
  process.exit(1);
});
