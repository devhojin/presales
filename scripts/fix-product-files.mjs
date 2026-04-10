// fix-product-files.mjs
// 1) 기존 product_files 전체 DELETE (test_document.pdf 잔재 포함)
// 2) Storage에서 test_document.pdf 삭제
// 3) documents_presales의 69개 파일을 Storage에 업로드 (ASCII 경로)
// 4) product_files 레코드 생성 (file_name은 원본 한글 유지)
// 5) user01 주문을 파일 있는 상품으로만 재생성

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 올바른 프로덕션 키 사용 (.env.production.local)
const envPath = path.join(__dirname, "..", ".env.production.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  let v = t.slice(i + 1).trim();
  if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
  v = v.replace(/\\n$/, "");
  env[t.slice(0, i).trim()] = v;
}

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_ROLE_KEY = env["SUPABASE_SERVICE_ROLE_KEY"];
const BUCKET = "product-files";
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) { console.error("env missing"); process.exit(1); }
console.log("Supabase URL:", SUPABASE_URL);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BASE = path.join(__dirname, "..", "documents_presales");

if (!fs.existsSync(BASE)) {
  console.error("documents_presales 폴더 없음:", BASE);
  process.exit(1);
}

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

// 파일 매핑: [product_id, folder, filename]
const MAPS = [
  [2, "06_사업계획서", "ARPU___.xlsx"],
  [3, "07_무료_산출물템플릿", "IoT_solution____.pptx"],
  [4, "07_무료_산출물템플릿", "WBS_ppt.pptx"],
  [4, "07_무료_산출물템플릿", "WBS.xls"],
  [5, "07_무료_산출물템플릿", "개인정보보호법_적용사례_상황별_맞춤_서비스_시나리오(100건).pdf"],
  [7, "07_무료_산출물템플릿", "기능_및_기술요건_정의서.docx"],
  [8, "01_기술제안서_PPT", "대형쇼핑몰사이트서비스정책서_통합본_1.1.docx"],
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
  [29, "01_기술제안서_PPT", "청해시_홈페이지_통합_유지보수_및_고도화_제안서_1.0.zip"],
  [30, "01_기술제안서_PPT", "청해시_홈페이지_통합_유지보수_및_고도화_제안서.zip"],
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
  [40, "01_기술제안서_PPT", "A3_가로제안서_떡제본(무선제본)_202405.pptx"],
  [40, "01_기술제안서_PPT", "[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip"],
  [40, "02_기술제안서_PDF", "pdf_[A3][정성적제안서]_IoT활용_에너지_효율_관리_시스템_구축_1.0_최종.zip"],
  [41, "01_기술제안서_PPT", "세로_45억_규모_공공_제안서_시스템_구축부문.zip"],
  [43, "01_기술제안서_PPT", "ISP_통합전산망_구축_정보화_전략계획.zip"],
  [44, "01_기술제안서_PPT", "______1.0.pptx"],
  [44, "02_기술제안서_PDF", "______1.0.pdf"],
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
  [59, "03_입찰가이드", "제안요청서작성가이드(2024).zip"],
];

async function uploadRaw(storagePath, buf, contentType) {
  const url = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body: buf,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`HTTP ${res.status}: ${t}`);
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function main() {
  console.log("\n=== PHASE 1: 기존 product_files 정리 ===");
  const { error: delErr, count: delCount } = await supabase
    .from("product_files")
    .delete({ count: "exact" })
    .gte("id", 0);
  if (delErr) { console.error("DELETE 실패:", delErr.message); process.exit(1); }
  console.log(`기존 product_files 레코드 삭제: ${delCount ?? '?'}건`);

  console.log("\n=== PHASE 2: test_document.pdf Storage 삭제 ===");
  const { error: rmErr } = await supabase.storage.from(BUCKET).remove(["test_document.pdf"]);
  if (rmErr) console.log(`test_document.pdf 삭제 경고: ${rmErr.message}`);
  else console.log("test_document.pdf 삭제 완료");

  console.log("\n=== PHASE 3: 파일 업로드 + product_files INSERT ===");
  console.log(`총 ${MAPS.length}개 매핑\n`);

  // 상품별 slot 카운터
  const slotMap = {};
  let ok = 0, err = 0, notFound = 0;
  const uploadedProductIds = new Set();

  for (let i = 0; i < MAPS.length; i++) {
    const [pid, folder, fname] = MAPS[i];
    const localPath = path.join(BASE, folder, fname);

    if (!fs.existsSync(localPath)) {
      console.log(`[${i+1}/${MAPS.length}] NOT FOUND: ${folder}/${fname}`);
      notFound++;
      continue;
    }

    const stat = fs.statSync(localPath);
    const ct = getMime(fname);
    const slot = (slotMap[pid] || 0) + 1;
    const ext = path.extname(fname).toLowerCase();
    const storagePath = `products/${pid}/file_${String(slot).padStart(3, "0")}${ext}`;

    try {
      const buf = fs.readFileSync(localPath);
      const fileUrl = await uploadRaw(storagePath, buf, ct);

      const { error: ie } = await supabase.from("product_files").insert({
        product_id: pid,
        file_name: fname,
        file_url: fileUrl,
        file_size: stat.size,
      });
      if (ie) throw new Error(`DB INSERT: ${ie.message}`);

      console.log(`[${i+1}/${MAPS.length}] OK pid=${pid} slot=${slot} | ${fname} (${(stat.size/1024).toFixed(1)}KB)`);
      slotMap[pid] = slot;
      uploadedProductIds.add(pid);
      ok++;
    } catch (e) {
      console.error(`[${i+1}/${MAPS.length}] ERROR pid=${pid} | ${fname}: ${e.message}`);
      err++;
    }
  }

  console.log(`\n업로드: 성공 ${ok}, 파일없음 ${notFound}, 오류 ${err}`);
  console.log(`파일 있는 상품 수: ${uploadedProductIds.size}`);

  console.log("\n=== PHASE 4: user01 주문을 파일 있는 상품으로만 재생성 ===");
  const { data: u01 } = await supabase.from("profiles")
    .select("id, email")
    .eq("email", "user01@test.com")
    .single();

  if (!u01) {
    console.log("user01@test.com 없음 - 주문 재생성 건너뜀");
  } else {
    // 기존 주문/다운로드 삭제
    const { data: oldOrders } = await supabase
      .from("orders").select("id").eq("user_id", u01.id);
    const oldOrderIds = (oldOrders || []).map(o => o.id);
    if (oldOrderIds.length > 0) {
      await supabase.from("order_items").delete().in("order_id", oldOrderIds);
      await supabase.from("orders").delete().in("id", oldOrderIds);
    }
    await supabase.from("download_logs").delete().eq("user_id", u01.id);

    // 파일 있는 유료 상품만 가져오기
    const productIds = Array.from(uploadedProductIds);
    const { data: availableProducts } = await supabase
      .from("products")
      .select("id, title, price, is_free, is_published")
      .in("id", productIds)
      .eq("is_free", false)
      .eq("is_published", true);

    const paidWithFiles = (availableProducts || []).filter(p => p.price > 0);
    console.log(`파일 있는 유료 상품: ${paidWithFiles.length}개`);

    if (paidWithFiles.length < 5) {
      console.log("유료 상품 부족 - 주문 5건만 생성");
    }

    const numOrders = Math.min(12, Math.max(5, paidWithFiles.length));
    for (let i = 0; i < numOrders; i++) {
      const itemCount = 1 + Math.floor(Math.random() * 2);
      const daysAgo = Math.floor(Math.random() * 90);
      const status = i < Math.floor(numOrders * 0.75) ? "paid" : (i < numOrders - 1 ? "cancelled" : "pending");

      const picked = [];
      while (picked.length < itemCount && picked.length < paidWithFiles.length) {
        const r = paidWithFiles[Math.floor(Math.random() * paidWithFiles.length)];
        if (!picked.find(p => p.id === r.id)) picked.push(r);
      }

      const total = picked.reduce((s, p) => s + p.price, 0);
      const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const paidAt = status === "paid" ? new Date(Date.now() - daysAgo * 86400000 + 5 * 60000).toISOString() : null;

      const { data: order, error: oe } = await supabase
        .from("orders")
        .insert({
          user_id: u01.id,
          total_amount: total,
          status,
          created_at: createdAt,
          paid_at: paidAt,
          payment_method: "card",
        })
        .select("id")
        .single();
      if (oe) { console.error(`주문 생성 실패 ${i+1}: ${oe.message}`); continue; }

      const items = picked.map(p => ({
        order_id: order.id,
        product_id: p.id,
        price: p.price,
        original_price: p.price,
      }));
      await supabase.from("order_items").insert(items);

      // paid 주문에 대해 다운로드 로그 생성
      if (status === "paid") {
        for (const p of picked) {
          const dlCount = 1 + Math.floor(Math.random() * 3);
          for (let d = 0; d < dlCount; d++) {
            await supabase.from("download_logs").insert({
              user_id: u01.id,
              product_id: p.id,
              file_name: p.title + ".pdf",
              downloaded_at: new Date(Date.now() - daysAgo * 86400000 + (d + 1) * 3600000).toISOString(),
            });
          }
        }
      }
    }
    console.log(`user01 주문 ${numOrders}건 재생성 완료`);
  }

  console.log("\n=== 완료 ===");
  const { count: finalCount } = await supabase
    .from("product_files")
    .select("*", { count: "exact", head: true });
  console.log(`최종 product_files 레코드: ${finalCount}건`);
}

main().catch(e => { console.error(e); process.exit(1); });
