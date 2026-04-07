// upload-product-files.mjs
// Supabase Storage product-files 버킷에 상품 파일 업로드 후
// product_files 테이블에 등록하는 스크립트
//
// [핵심] Supabase Storage는 한글/특수문자 파일명 거부 (Invalid key)
// Storage 경로: products/{id}/file_NNN.ext (ASCII 안전)
// DB file_name: 원본 한글 파일명 보존
// DB file_url: Storage API 경로

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
const BUCKET = "product-files";
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error("env missing"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BASE = "C:\\Users\\hojin\\Dropbox\\Project_documents\\documents_presales";

const MIME = {
  ".pdf": "application/pdf",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".ppt": "application/vnd.ms-powerpoint",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".xls": "application/vnd.ms-excel",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".doc": "application/msword",
  ".hwp": "application/x-hwp",
  ".zip": "application/zip",
};
const getMime = f => MIME[path.extname(f).toLowerCase()] || "application/octet-stream";
const fmtSz = b => b < 1024 ? b + " B" : b < 1048576 ? (b/1024).toFixed(1) + " KB" : (b/1048576).toFixed(1) + " MB";
const mkPath = (pid, fn, slot) => "products/" + pid + "/file_" + String(slot).padStart(3, "0") + path.extname(fn).toLowerCase();

async function doUpload(sp, buf, ct) {
  const url = SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + sp;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": "Bearer " + SERVICE_ROLE_KEY, "Content-Type": ct, "x-upsert": "true" },
    body: buf,
  });
  if (!res.ok) { const t = await res.text(); throw new Error("HTTP " + res.status + ": " + t); }
  return SUPABASE_URL + "/storage/v1/object/" + BUCKET + "/" + sp;
}

const MAPS = [
  [2, "07_무료_산출물템플릿", "ARPU___.xlsx"],
  [3, "07_무료_산출물템플릿", "IoT_solution____.pptx"],
  [4, "07_무료_산출물템플릿", "WBS_ppt.pptx"],
  [4, "07_무료_산출물템플릿", "WBS.xls"],
  [5, "07_무료_산출물템플릿", "개인정보보호법_적용사례_상황별_맞춤_서비스_시나리오(100건).pdf"],
  [7, "07_무료_산출물템플릿", "기능_및_기술요건_정의서.docx"],
  [8, "02_기술제안서_PDF", "__v1.0.pdf"],
  [9, "07_무료_산출물템플릿", "데이터전환계획서.doc"],
  [10, "07_무료_산출물템플릿", "Device.pptx"],
  [11, "07_무료_산출물템플릿", "PMO_.doc"],
  [12, "07_무료_산출물템플릿", "_.docx"],
  [13, "07_무료_산출물템플릿", "(ERD).ppt"],
  [14, "07_무료_산출물템플릿", "___V1.0.xls"],
  [16, "07_무료_산출물템플릿", "__.zip"],
  [17, "07_무료_산출물템플릿", "_ (1).xlsx"],
  [19, "01_기술제안서_PPT", "나라장터_입찰_제안서-시스템_구축부문_(30억_규모).zip"],
  [20, "01_기술제안서_PPT", "00.IoT_Solution_Monitor_MMI_v1.0.pptx"],
  [23, "01_기술제안서_PPT", "[Shopping_mall_BM]Proposal_ver1.0.pptx"],
  [23, "02_기술제안서_PDF", "[Shopping_mall_BM]Proposal_ver1.0.pdf"],
  [24, "02_기술제안서_PDF", "[]_IoT_ooo_oooooo____1.2_full.pdf"],
  [25, "01_기술제안서_PPT", "제안서_ooooo_월_1억매출_금융재단_업무시스템_통합유지보수_컬러.pptx"],
  [27, "01_기술제안서_PPT", "IoT_기반_장비_시설물_원격감시체계_구축사업_2.0.zip"],
  [27, "02_기술제안서_PDF", "IoT_기반_장비_시설물_원격감시체계_구축사업_2.0_PDF.zip"],
  [28, "01_기술제안서_PPT", "대형쇼핑몰사이트서비스정책서_통합본_1.1.docx"],
  [28, "02_기술제안서_PDF", "대형쇼핑몰사이트서비스정책서_통합본_1.1.pdf"],
  [29, "01_기술제안서_PPT", "______1.0.pptx"],
  [29, "02_기술제안서_PDF", "______1.0.pdf"],
  [30, "01_기술제안서_PPT", "청해시_홈페이지_통합_유지보수_및_고도화_제안서.zip"],
  [30, "01_기술제안서_PPT", "청해시_홈페이지_통합_유지보수_및_고도화_제안서_1.0.zip"],
  [31, "04_발표자료", "xxx___Service_User_Interface_.pptx"],
  [32, "01_기술제안서_PPT", "악성코드_은닉사이트_조치_및_기술지원_용역.zip"],
  [32, "02_기술제안서_PDF", "pdf_악성코드_은닉사이트_조치_및_기술지원_용역.zip"],
  [33, "05_가격제안", "사업비_세부내역_산출(비목_산출표).zip"],
  [34, "04_발표자료", "155_광고플랫폼_스토리보드.zip"],
  [35, "01_기술제안서_PPT", "박물관_산업활용_디자인DB_구축_1.0.pptx"],
  [35, "02_기술제안서_PDF", "박물관_산업활용_디자인DB_구축_1.0.pdf"],
  [36, "01_기술제안서_PPT", "네트워크_보안_인력_양성_교육플랫폼_구축_및_운영_제안_1.0.pptx"],
  [36, "02_기술제안서_PDF", "네트워크_보안_인력_양성_교육플랫폼_구축_및_운영_제안_1.0.pdf"],
  [37, "01_기술제안서_PPT", "정보보안_업무관리_시스템_구축-제안서_1.0.pptx"],
  [37, "02_기술제안서_PDF", "정보보안_업무관리_시스템_구축-제안서_1.0.pdf"],
  [38, "01_기술제안서_PPT", "농산물_물류_추적_및_관리_시스템_구축과_유지보수_용역_1.0.pptx"],
  [38, "02_기술제안서_PDF", "농산물_물류_추적_및_관리_시스템_구축과_유지보수_용역_1.0.pdf"],
  [39, "01_기술제안서_PPT", "1._화영시_여객서비스_입주기업_지원_포털사이트_제안서.zip"],
  [39, "02_기술제안서_PDF", "화영시_여객서비스_입주기업_지원_포털사이트_제안서_pdf.zip"],
  [40, "01_기술제안서_PPT", "[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip"],
  [40, "02_기술제안서_PDF", "pdf_[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip"],
  [40, "02_기술제안서_PDF", "pdf_IoT활용_에너지_효율_관리_시스템_구축.zip"],
  [40, "01_기술제안서_PPT", "A3_가로제안서_떡제본(무선제본)_202405.pptx"],
  [41, "01_기술제안서_PPT", "세로_45억_규모_공공_제안서_시스템_구축부문.zip"],
  [43, "01_기술제안서_PPT", "ISP_통합전산망_구축_정보화_전략계획.zip"],
  [45, "06_사업계획서", "맥동_인공지능_허준_사업계획서_창업지원_예비창업패키지.zip"],
  [46, "01_기술제안서_PPT", "SLA_서비스품질관리_부문제안서_1.0_A4.pptx"],
  [47, "04_발표자료", "XX학원_LMS_분석설계.pptx"],
  [48, "03_입찰가이드", "MOU양식.doc"],
  [49, "03_입찰가이드", "수행계획서_MSword.docx"],
  [50, "07_무료_산출물템플릿", "엔티티정의서.zip"],
  [51, "03_입찰가이드", "우선협상대상자_기술협상안(안).hwp"],
  [52, "03_입찰가이드", "제안목차_참조.xls"],
  [53, "03_입찰가이드", "제안서_목차_템플릿(2024).xlsx"],
  [54, "05_가격제안", "투찰가_산정_지분율_계산.xlsx"],
  [55, "03_입찰가이드", "특허청_소프트웨어(SW)_개발방법론.pdf"],
  [56, "07_무료_산출물템플릿", "프로그램목록-V1.0.xlsx"],
  [57, "04_발표자료", "프로젝트명_IA_Document_기획.xlsx"],
  [58, "01_기술제안서_PPT", "상품이력제_정보시스템_구욱_용역_사업_1.0.pptx"],
  [58, "02_기술제안서_PDF", "상품이력제_정보시스템_구욱_용역_사업_1.0.pdf"],
  [59, "03_입찰가이드", "제안요청서작성가이드(2024).zip"]
];

async function main() {
  console.log("=== Supabase 상품 파일 업로드 시작 ===");
  console.log("Storage 경로: products/{id}/file_NNN.ext (ASCII 안전)\n");

  const { data: existingFiles, error } = await supabase.from("product_files").select("product_id, file_name");
  if (error) { console.error("조회 실패:", error.message); process.exit(1); }

  const existingSet = new Set(existingFiles.map(r => r.product_id + "__" + r.file_name));
  const slotMap = {};
  for (const r of existingFiles) slotMap[r.product_id] = (slotMap[r.product_id] || 0) + 1;
  console.log("기존 등록 파일: " + existingFiles.length + "개\n");

  let ok = 0, skip = 0, errCnt = 0;

  for (let i = 0; i < MAPS.length; i++) {
    const [pid, folder, fname] = MAPS[i];
    const key = pid + "__" + fname;

    if (existingSet.has(key)) {
      console.log("[" + (i+1) + "/" + MAPS.length + "] SKIP pid=" + pid + " | " + fname);
      skip++; continue;
    }

    const lp = path.join(BASE, folder, fname);
    if (!fs.existsSync(lp)) {
      console.log("[" + (i+1) + "/" + MAPS.length + "] NOT FOUND: " + fname);
      errCnt++; continue;
    }

    const stat = fs.statSync(lp);
    const sz = fmtSz(stat.size);
    const ct = getMime(fname);
    const slot = (slotMap[pid] || 0) + 1;
    const sp = mkPath(pid, fname, slot);

    console.log("[" + (i+1) + "/" + MAPS.length + "] UPLOAD pid=" + pid + " | " + fname + " (" + sz + ")");
    console.log("    -> " + sp);

    try {
      const buf = fs.readFileSync(lp);
      const fileUrl = await doUpload(sp, buf, ct);
      const { error: ie } = await supabase.from("product_files").insert({ product_id: pid, file_name: fname, file_url: fileUrl, file_size: sz });
      if (ie) { console.error("    DB INSERT 실패:", ie.message); errCnt++; continue; }
      console.log("    OK");
      existingSet.add(key);
      slotMap[pid] = slot;
      ok++;
    } catch(e) {
      console.error("    ERROR:", e.message);
      errCnt++;
    }
  }

  console.log("\n=== 완료 ===");
  console.log("성공: " + ok + "개, 스킵: " + skip + "개, 오류: " + errCnt + "개, 합계: " + MAPS.length + "개");
}

main().catch(e => { console.error(e); process.exit(1); });
