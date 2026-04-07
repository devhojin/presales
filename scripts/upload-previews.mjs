// upload-previews.mjs
// PDF 미리보기 파일을 product-previews 버킷에 업로드하고
// products.preview_pdf_url, preview_clear_pages, preview_blur_pages를 설정

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];
const BUCKET = "product-previews";

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const PDF_DIR = path.join(
  "C:\\Users\\hojin\\Dropbox\\Project_documents\\documents_presales",
  "02_기술제안서_PDF"
);

// product_id -> PDF 파일명 매핑
const MAPS = [
  [23, "[Shopping_mall_BM]Proposal_ver1.0.pdf"],
  [24, "[]_IoT_ooo_oooooo____1.2_full.pdf"],
  [25, "_ooooo____.pdf"],
  [29, "______1.0.pdf"],
  [35, "박물관_산업활용_디자인DB_구축_1.0.pdf"],
  [36, "네트워크_보안_인력_양성_교육플랫폼_구축_및_운영_제안_1.0.pdf"],
  [37, "정보보안_업무관리_시스템_구축-제안서_1.0.pdf"],
  [38, "농산물_물류_추적_및_관리_시스템_구축과_유지보수_용역_1.0.pdf"],
  [58, "상품이력제_정보시스템_구욱_용역_사업_1.0.pdf"],
  [28, "대형쇼핑몰사이트서비스정책서_통합본_1.1.pdf"],
];

const PREVIEW_CLEAR_PAGES = 3;
const PREVIEW_BLUR_PAGES = 5;

const fmtSz = (b) =>
  b < 1024
    ? b + " B"
    : b < 1048576
      ? (b / 1024).toFixed(1) + " KB"
      : (b / 1048576).toFixed(1) + " MB";

async function uploadFile(storagePath, buf) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/pdf",
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
}

function getPublicUrl(storagePath) {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function main() {
  console.log("=== PDF 미리보기 업로드 시작 ===");
  console.log(`버킷: ${BUCKET} (public)`);
  console.log(`clear_pages: ${PREVIEW_CLEAR_PAGES}, blur_pages: ${PREVIEW_BLUR_PAGES}\n`);

  let ok = 0;
  let errCnt = 0;
  let skip = 0;

  for (let i = 0; i < MAPS.length; i++) {
    const [pid, fname] = MAPS[i];
    const storagePath = `previews/${pid}.pdf`;
    const localPath = path.join(PDF_DIR, fname);
    const label = `[${i + 1}/${MAPS.length}]`;

    if (!fs.existsSync(localPath)) {
      console.log(`${label} NOT FOUND pid=${pid} | ${fname}`);
      errCnt++;
      continue;
    }

    const stat = fs.statSync(localPath);
    const sz = fmtSz(stat.size);

    console.log(`${label} UPLOAD pid=${pid} | ${fname} (${sz})`);
    console.log(`    -> ${storagePath}`);

    try {
      const buf = fs.readFileSync(localPath);
      await uploadFile(storagePath, buf);

      const publicUrl = getPublicUrl(storagePath);

      const { error: ue } = await supabase
        .from("products")
        .update({
          preview_pdf_url: publicUrl,
          preview_clear_pages: PREVIEW_CLEAR_PAGES,
          preview_blur_pages: PREVIEW_BLUR_PAGES,
        })
        .eq("id", pid);

      if (ue) {
        console.error(`    DB UPDATE 실패: ${ue.message}`);
        errCnt++;
        continue;
      }

      console.log(`    OK -> ${publicUrl}`);
      ok++;
    } catch (e) {
      console.error(`    ERROR: ${e.message}`);
      errCnt++;
    }
  }

  console.log("\n=== 완료 ===");
  console.log(
    `성공: ${ok}개, 스킵: ${skip}개, 오류: ${errCnt}개, 합계: ${MAPS.length}개`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
