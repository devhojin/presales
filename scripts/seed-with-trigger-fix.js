/**
 * 트리거 비활성화 → 회원생성 → 프로필 수동 삽입 → 트리거 복원 → 주문/리뷰 생성
 */

const BASE = "https://vswkrbemigyclgjrpgqt.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2tyYmVtaWd5Y2xnanJwZ3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2MzkyNiwiZXhwIjoyMDkwODM5OTI2fQ.IhMA-LZMOR3v8bY2kelUzarsHU1lOB9JY4I7HJ0oi2g";

const LAST_NAMES = ["김","이","박","최","정","강","조","윤","장","임","한","오","서","신","권","황","안","송","류","홍"];
const FIRST_NAMES = ["민준","서연","예준","서윤","도윤","지우","시우","하은","주원","하윤","지호","수빈","현우","지민","준서","채원","건우","유나","우진","소율","성민","은서","재현","미래","태호","수진","영호","지현","상우","예진"];
const COMPANIES = ["한국전자통신","대한솔루션","서울IT시스템","부산테크","인천정보통신","대전소프트","광주디지털","수원네트웍스","성남클라우드","고양시스템","용인테크놀로지","화성ICT","청주데이터","전주소프트웨어","제주IT랩","세종시스템즈","파주테크","김포디지털","안양솔루션","평택정보"];
const STATUSES = ["paid","paid","paid","paid","paid","pending","pending","cancelled","refunded"];
const METHODS = ["card","card","card","card","bank_transfer"];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function phone() { return `010-${String(Math.floor(Math.random()*9000)+1000)}-${String(Math.floor(Math.random()*9000)+1000)}`; }
function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random()*14)+8, Math.floor(Math.random()*60), Math.floor(Math.random()*60));
  return d.toISOString();
}

async function api(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json", Prefer: "return=representation", ...opts.headers },
  });
  return res.json();
}

async function authApi(path, opts = {}) {
  const res = await fetch(BASE + "/auth/v1" + path, {
    ...opts,
    headers: { apikey: SERVICE_KEY, Authorization: "Bearer " + SERVICE_KEY, "Content-Type": "application/json" },
  });
  return res.json();
}

async function main() {
  console.log("=== 시딩 시작 ===\n");

  // 1. 상품 조회
  const products = await api("/rest/v1/products?is_published=eq.true&select=id,title,price,is_free&order=id");
  console.log(`상품: ${products.length}개\n`);

  // 2. 회원 30명 생성 (트리거 없이)
  console.log("회원 30명 생성 (트리거 없이 직접 삽입)...");
  const users = [];

  for (let i = 1; i <= 30; i++) {
    const name = pick(LAST_NAMES) + pick(FIRST_NAMES);
    const email = `user${String(i).padStart(2,"0")}@test.com`;

    // GoTrue에서 user 생성 시도
    const authData = await authApi("/admin/users", {
      method: "POST",
      body: JSON.stringify({ email, password: "Test123!", email_confirm: true, user_metadata: { name } }),
    });

    if (authData.id) {
      // 성공 → profiles 수동 삽입 (트리거가 실패해도 auth user는 만들어짐)
      await api("/rest/v1/profiles", {
        method: "POST",
        body: JSON.stringify({ id: authData.id, email, name, phone: phone(), company: pick(COMPANIES), role: "user" }),
        headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
      });
      users.push({ id: authData.id, email, name });
      process.stdout.write("O");
    } else {
      // 이미 존재 → profiles에서 조회
      const existing = await api(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id,email,name`);
      if (existing.length > 0) {
        users.push(existing[0]);
        process.stdout.write(".");
      } else {
        // auth에는 있으나 profiles에 없는 경우 → auth 목록에서 찾기
        const allUsers = await authApi("/admin/users");
        const found = allUsers.users?.find(u => u.email === email);
        if (found) {
          await api("/rest/v1/profiles", {
            method: "POST",
            body: JSON.stringify({ id: found.id, email, name, phone: phone(), company: pick(COMPANIES), role: "user" }),
            headers: { Prefer: "return=minimal,resolution=merge-duplicates" },
          });
          users.push({ id: found.id, email, name });
          process.stdout.write("+");
        } else {
          process.stdout.write("x");
        }
      }
    }
  }
  console.log(`\n회원 ${users.length}명 준비 완료\n`);

  if (users.length === 0) { console.log("회원 없음. 종료."); return; }

  // 3. 주문 40건 생성
  console.log("주문 40건 생성...");
  const paidProducts = products.filter(p => !p.is_free && p.price > 0);
  const allProducts = products;
  let orderCount = 0;

  for (let i = 0; i < 40; i++) {
    const user = pick(users);
    const status = pick(STATUSES);
    const createdAt = randomDate(30);
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const pool = paidProducts.length > 0 && Math.random() > 0.3 ? paidProducts : allProducts;
    const selected = [];
    for (let j = 0; j < itemCount; j++) {
      const p = pick(pool);
      if (!selected.find(s => s.id === p.id)) selected.push(p);
    }
    if (selected.length === 0) selected.push(pick(allProducts));

    const totalAmount = selected.reduce((s, p) => s + (p.price || 0), 0);
    const paidAt = status === "paid" ? createdAt : null;

    const order = await api("/rest/v1/orders", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, total_amount: totalAmount, status, payment_method: pick(METHODS), paid_at: paidAt, created_at: createdAt }),
    });

    if (!order?.[0]?.id) { process.stdout.write("x"); continue; }

    await api("/rest/v1/order_items", {
      method: "POST",
      body: JSON.stringify(selected.map(p => ({ order_id: order[0].id, product_id: p.id, price: p.price || 0 }))),
    });

    // 결제완료 주문: 다운로드 로그 (50%)
    if (status === "paid" && Math.random() > 0.5) {
      for (const p of selected) {
        await api("/rest/v1/download_logs", {
          method: "POST",
          body: JSON.stringify({ user_id: user.id, product_id: p.id, file_name: `${p.title}.pdf`, downloaded_at: randomDate(14) }),
        });
      }
    }

    orderCount++;
    process.stdout.write(".");
  }
  console.log(`\n주문 ${orderCount}건 완료\n`);

  // 4. 리뷰 생성
  console.log("리뷰 생성...");
  const REVIEWS = [
    { title: "정말 유용합니다", content: "제안서 작성에 큰 도움이 되었습니다.", rating: 5, pros: "체계적 구성", cons: "없음" },
    { title: "괜찮은 템플릿", content: "기본 구조는 좋은데 예시가 더 있으면 좋겠습니다.", rating: 4, pros: "가격 대비 괜찮음", cons: "예시 부족" },
    { title: "실전에서 바로 활용", content: "이번 입찰에서 낙찰 받았습니다!", rating: 5, pros: "실전 활용도 높음", cons: "없음" },
    { title: "기대 이상이에요", content: "처음 공공조달 참여하는데 많은 도움이 됐습니다.", rating: 5, pros: "초보자도 이해 가능", cons: "없음" },
    { title: "보통입니다", content: "가격에 비해 내용이 조금 아쉽습니다.", rating: 3, pros: "빠른 다운로드", cons: "내용 아쉬움" },
    { title: "추천합니다", content: "동료에게도 추천했습니다. 품질이 좋아요.", rating: 4, pros: "디자인 깔끔", cons: "업데이트 희망" },
  ];
  let reviewCount = 0;
  const done = new Set();
  for (const user of users.slice(0, 15)) {
    const p = pick(paidProducts.length > 0 ? paidProducts : allProducts);
    const key = user.id + "_" + p.id;
    if (done.has(key)) continue;
    done.add(key);
    const r = pick(REVIEWS);
    const res = await api("/rest/v1/reviews", {
      method: "POST",
      body: JSON.stringify({ user_id: user.id, product_id: p.id, ...r, is_published: true, is_verified_purchase: true, created_at: randomDate(20) }),
    });
    if (Array.isArray(res) && res.length > 0) { reviewCount++; process.stdout.write("."); }
    else process.stdout.write("x");
  }
  console.log(`\n리뷰 ${reviewCount}건 완료\n`);

  console.log("=== 완료 ===");
  console.log(`회원: ${users.length}명 | 주문: ${orderCount}건 | 리뷰: ${reviewCount}건`);
  console.log("테스트 로그인: user01@test.com ~ user30@test.com / Test123!");
}

main().catch(console.error);
