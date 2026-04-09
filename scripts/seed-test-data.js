/**
 * 테스트 데이터 시딩 스크립트
 * - 가상 회원 30명 생성 (auth.users + profiles)
 * - 주문 40건 생성 (orders + order_items)
 * - 다운로드 로그, 리뷰 등 연결
 */

const BASE = "https://vswkrbemigyclgjrpgqt.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2tyYmVtaWd5Y2xnanJwZ3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNjM5MjYsImV4cCI6MjA5MDgzOTkyNn0.pm655gp6EJkr8XbLgH8PDRszhw2pk3ReJpVux2t39Gs";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzd2tyYmVtaWd5Y2xnanJwZ3F0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTI2MzkyNiwiZXhwIjoyMDkwODM5OTI2fQ.IhMA-LZMOR3v8bY2kelUzarsHU1lOB9JY4I7HJ0oi2g";

// 한국 이름 풀
const LAST_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임", "한", "오", "서", "신", "권", "황", "안", "송", "류", "홍"];
const FIRST_NAMES = ["민준", "서연", "예준", "서윤", "도윤", "지우", "시우", "하은", "주원", "하윤", "지호", "수빈", "현우", "지민", "준서", "채원", "건우", "유나", "우진", "소율", "성민", "은서", "재현", "미래", "태호", "수진", "영호", "지현", "상우", "예진"];
const COMPANIES = ["한국전자통신", "대한솔루션", "서울IT시스템", "부산테크", "인천정보통신", "대전소프트", "광주디지털", "수원네트웍스", "성남클라우드", "고양시스템", "용인테크놀로지", "화성ICT", "청주데이터", "전주소프트웨어", "제주IT랩", "세종시스템즈", "파주테크", "김포디지털", "안양솔루션", "평택정보"];
const PHONES = () => `010-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
const STATUSES = ["paid", "paid", "paid", "paid", "paid", "pending", "pending", "cancelled", "refunded"];
const METHODS = ["card", "card", "card", "card", "bank_transfer"];

function randomDate(daysBack) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(Math.floor(Math.random() * 14) + 8, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return d.toISOString();
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function fetchApi(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: "Bearer " + SERVICE_KEY,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
  });
  return res.json();
}

async function main() {
  console.log("=== 테스트 데이터 시딩 시작 ===\n");

  // 1. 상품 목록 조회
  console.log("1. 상품 목록 조회...");
  const products = await fetchApi("/rest/v1/products?is_published=eq.true&select=id,title,price,is_free&order=id");
  console.log(`   ${products.length}개 상품 확인\n`);

  if (products.length === 0) {
    console.log("   상품이 없습니다. 종료.");
    return;
  }

  // 2. 가상 회원 30명 생성
  console.log("2. 가상 회원 30명 생성...");
  const users = [];

  for (let i = 1; i <= 30; i++) {
    const lastName = pick(LAST_NAMES);
    const firstName = pick(FIRST_NAMES);
    const name = lastName + firstName;
    const email = `user${String(i).padStart(2, "0")}@test.com`;
    const phone = PHONES();
    const company = pick(COMPANIES);

    // auth user 생성
    const authRes = await fetch(BASE + "/auth/v1/admin/users", {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: "Bearer " + SERVICE_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password: "Test123!",
        email_confirm: true,
        user_metadata: { name },
      }),
    });
    const authData = await authRes.json();

    if (!authData.id) {
      // 이미 존재하면 조회
      const existingUsers = await fetchApi(`/rest/v1/profiles?email=eq.${email}&select=id,email,name`);
      if (existingUsers.length > 0) {
        users.push({ id: existingUsers[0].id, email, name });
        process.stdout.write(".");
        continue;
      }
      console.log(`\n   SKIP ${email}: ${authData.msg || "error"}`);
      continue;
    }

    // profile 업데이트
    await fetchApi(`/rest/v1/profiles?id=eq.${authData.id}`, {
      method: "PATCH",
      body: JSON.stringify({ name, phone, company, role: "user" }),
    });

    users.push({ id: authData.id, email, name });
    process.stdout.write(".");
  }
  console.log(`\n   ${users.length}명 생성 완료\n`);

  if (users.length === 0) {
    console.log("   회원 생성 실패. 종료.");
    return;
  }

  // 3. 주문 40건 생성
  console.log("3. 주문 40건 생성...");
  const paidProducts = products.filter(p => !p.is_free && p.price > 0);
  const freeProducts = products.filter(p => p.is_free || p.price === 0);
  let orderCount = 0;

  for (let i = 0; i < 40; i++) {
    const user = pick(users);
    const status = pick(STATUSES);
    const createdAt = randomDate(30);

    // 1~3개 상품 선택
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const selectedProducts = [];
    const pool = Math.random() > 0.3 ? paidProducts : freeProducts;

    for (let j = 0; j < itemCount && pool.length > 0; j++) {
      const p = pool[Math.floor(Math.random() * pool.length)];
      if (!selectedProducts.find(sp => sp.id === p.id)) {
        selectedProducts.push(p);
      }
    }

    if (selectedProducts.length === 0) {
      selectedProducts.push(pick(products));
    }

    const totalAmount = selectedProducts.reduce((sum, p) => sum + (p.price || 0), 0);
    const paymentMethod = pick(METHODS);
    const paidAt = status === "paid" ? createdAt : null;

    // 주문 생성
    const orderData = await fetchApi("/rest/v1/orders", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        total_amount: totalAmount,
        status,
        payment_method: paymentMethod,
        paid_at: paidAt,
        created_at: createdAt,
      }),
    });

    if (!orderData || !orderData[0]?.id) {
      process.stdout.write("x");
      continue;
    }

    const orderId = orderData[0].id;

    // 주문 상품 등록
    const orderItems = selectedProducts.map(p => ({
      order_id: orderId,
      product_id: p.id,
      price: p.price || 0,
    }));

    await fetchApi("/rest/v1/order_items", {
      method: "POST",
      body: JSON.stringify(orderItems),
    });

    // 결제 완료 주문은 다운로드 로그 생성 (50% 확률)
    if (status === "paid" && Math.random() > 0.5) {
      for (const p of selectedProducts) {
        await fetchApi("/rest/v1/download_logs", {
          method: "POST",
          body: JSON.stringify({
            user_id: user.id,
            product_id: p.id,
            file_name: `${p.title}.pdf`,
            downloaded_at: randomDate(14),
            user_name: user.name,
          }),
        });
      }
    }

    orderCount++;
    process.stdout.write(".");
  }
  console.log(`\n   ${orderCount}건 생성 완료\n`);

  // 4. 리뷰 일부 생성 (paid 주문의 30%)
  console.log("4. 리뷰 생성...");
  const REVIEW_CONTENTS = [
    { title: "정말 유용합니다", content: "제안서 작성에 큰 도움이 되었습니다. 구조가 잘 잡혀있어요.", rating: 5, pros: "체계적인 구성", cons: "없음" },
    { title: "괜찮은 템플릿", content: "기본 구조는 좋은데, 업종별 예시가 더 있으면 좋겠습니다.", rating: 4, pros: "가격 대비 괜찮음", cons: "예시 부족" },
    { title: "실전에서 바로 활용", content: "이번 입찰에서 이 문서 덕분에 낙찰 받았습니다!", rating: 5, pros: "실전 활용도 높음", cons: "특별히 없음" },
    { title: "기대 이상", content: "처음 공공조달에 참여하는데 많은 도움이 됐습니다.", rating: 5, pros: "초보자도 이해 가능", cons: "없음" },
    { title: "보통입니다", content: "가격에 비해 내용이 조금 아쉽습니다.", rating: 3, pros: "빠른 다운로드", cons: "내용 부실" },
    { title: "추천합니다", content: "동료에게도 추천했습니다. 품질이 좋습니다.", rating: 4, pros: "디자인 깔끔", cons: "업데이트 희망" },
  ];

  let reviewCount = 0;
  const reviewPairs = new Set(); // user_id + product_id 중복 방지

  for (const user of users.slice(0, 15)) {
    if (Math.random() > 0.5) continue;

    const product = pick(paidProducts.length > 0 ? paidProducts : products);
    const pairKey = `${user.id}_${product.id}`;
    if (reviewPairs.has(pairKey)) continue;
    reviewPairs.add(pairKey);

    const review = pick(REVIEW_CONTENTS);

    const res = await fetchApi("/rest/v1/reviews", {
      method: "POST",
      body: JSON.stringify({
        user_id: user.id,
        product_id: product.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        pros: review.pros,
        cons: review.cons,
        is_published: true,
        is_verified_purchase: true,
        created_at: randomDate(20),
      }),
    });

    if (Array.isArray(res) && res.length > 0) {
      reviewCount++;
      process.stdout.write(".");
    }
  }
  console.log(`\n   ${reviewCount}건 생성 완료\n`);

  // 5. 결과 요약
  console.log("=== 시딩 완료 ===");
  console.log(`회원: ${users.length}명`);
  console.log(`주문: ${orderCount}건`);
  console.log(`리뷰: ${reviewCount}건`);
  console.log(`\n로그인: user01@test.com ~ user30@test.com / Test123!`);
}

main().catch(console.error);
