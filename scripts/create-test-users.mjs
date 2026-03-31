// 테스트 회원 10명 + 구매기록 + 상담기록 생성
const SUPABASE_URL = 'https://egumjqaloqdvxpslbsba.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndW1qcWFsb3Fkdnhwc2xic2JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MjQzOCwiZXhwIjoyMDg5ODY4NDM4fQ.KCBuPLhMAPMCpvIyQF0yLrgypiYrkeZ3olacu6ERb1s'

const headers = {
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
}

const testUsers = [
  { email: 'user01@test.com', name: '김영수', phone: '010-1234-5678', company: '(주)테크솔루션', role: 'user' },
  { email: 'user02@test.com', name: '이미영', phone: '010-2345-6789', company: '스마트시스템즈', role: 'user' },
  { email: 'user03@test.com', name: '박정호', phone: '010-3456-7890', company: '(주)글로벌IT', role: 'user' },
  { email: 'user04@test.com', name: '최수연', phone: '010-4567-8901', company: '넥스트웨이브', role: 'user' },
  { email: 'user05@test.com', name: '정민석', phone: '010-5678-9012', company: '(주)디지털브릿지', role: 'user' },
  { email: 'user06@test.com', name: '한소희', phone: '010-6789-0123', company: '클라우드원', role: 'user' },
  { email: 'user07@test.com', name: '윤재혁', phone: '010-7890-1234', company: '(주)데이터플러스', role: 'user' },
  { email: 'user08@test.com', name: '서지원', phone: '010-8901-2345', company: '시큐리티랩', role: 'user' },
  { email: 'user09@test.com', name: '강현우', phone: '010-9012-3456', company: '(주)인사이트코리아', role: 'user' },
  { email: 'admin@amarans.co.kr', name: '채호진', phone: '010-9940-7909', company: 'AMARANS Partners', role: 'admin' },
]

async function supabasePost(path, body) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

async function supabaseRpc(path, body) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  return res.json()
}

async function main() {
  const userIds = []

  // 1. Create auth users
  console.log('=== 테스트 회원 생성 ===')
  for (const u of testUsers) {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: u.email,
        password: 'Test123!',
        email_confirm: true,
        user_metadata: { name: u.name },
      }),
    })
    const data = await res.json()

    if (data.id) {
      userIds.push({ id: data.id, ...u })
      console.log(`✅ ${u.name} (${u.email}) — ${data.id}`)

      // Update profile
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${data.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          name: u.name,
          phone: u.phone,
          company: u.company,
          role: u.role,
        }),
      })
    } else if (data.msg?.includes('already') || data.message?.includes('already')) {
      console.log(`⏭️ ${u.name} (${u.email}) — 이미 존재`)
      // Get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
        headers,
      })
      const listData = await listRes.json()
      const existing = listData.users?.find(x => x.email === u.email)
      if (existing) {
        userIds.push({ id: existing.id, ...u })
        await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${existing.id}`, {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            name: u.name,
            phone: u.phone,
            company: u.company,
            role: u.role,
          }),
        })
      }
    } else {
      console.log(`❌ ${u.name} — ${JSON.stringify(data)}`)
    }
  }

  if (userIds.length === 0) {
    console.log('회원이 생성되지 않았습니다.')
    return
  }

  // 2. Create orders with items
  console.log('\n=== 구매 기록 생성 ===')
  const orderData = [
    { userIdx: 0, products: [17, 27], total: 298000 },
    { userIdx: 1, products: [35], total: 199000 },
    { userIdx: 2, products: [25, 37], total: 278000 },
    { userIdx: 3, products: [28], total: 69000 },
    { userIdx: 4, products: [17, 18], total: 398000 },
    { userIdx: 5, products: [23, 30], total: 188000 },
    { userIdx: 6, products: [41], total: 149000 },
    { userIdx: 7, products: [37, 42], total: 278000 },
    { userIdx: 8, products: [27, 28, 32], total: 203000 },
    { userIdx: 0, products: [42], total: 149000 },
    { userIdx: 1, products: [17], total: 199000 },
    { userIdx: 3, products: [26, 40], total: 188000 },
  ]

  for (let i = 0; i < orderData.length; i++) {
    const od = orderData[i]
    const user = userIds[od.userIdx]
    if (!user) continue

    const orderNum = `ORD-2026${String(i + 1).padStart(4, '0')}`
    const status = i < 8 ? 'paid' : (i < 10 ? 'pending' : 'cancelled')
    const daysAgo = Math.floor(Math.random() * 30) + 1
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

    // Insert order
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=representation' },
      body: JSON.stringify({
        order_number: orderNum,
        user_id: user.id,
        status,
        total_amount: od.total,
        payment_method: '카드',
        paid_at: status === 'paid' ? createdAt : null,
        created_at: createdAt,
      }),
    })
    const orderResult = await orderRes.json()
    const orderId = orderResult[0]?.id

    if (orderId) {
      // Insert order items
      for (const prodId of od.products) {
        const priceRes = await fetch(`${SUPABASE_URL}/rest/v1/products?id=eq.${prodId}&select=price`, { headers })
        const priceData = await priceRes.json()
        const price = priceData[0]?.price || 99000

        await fetch(`${SUPABASE_URL}/rest/v1/order_items`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            order_id: orderId,
            product_id: prodId,
            price,
          }),
        })
      }
      console.log(`✅ ${orderNum} — ${user.name} — ${status} — ${od.total.toLocaleString()}원`)
    } else {
      console.log(`❌ ${orderNum} — ${JSON.stringify(orderResult)}`)
    }
  }

  // 3. Create consulting requests
  console.log('\n=== 상담 기록 생성 ===')
  const consultingData = [
    { userIdx: 0, pkg: 'spot', msg: '나라장터 입찰 처음인데 제안서 구조 잡는 것부터 도움 받고 싶습니다.', status: 'completed' },
    { userIdx: 1, pkg: 'review', msg: '이번에 30억 규모 시스템 구축 제안서를 작성했는데 전문가 리뷰 받고 싶어요.', status: 'completed' },
    { userIdx: 2, pkg: 'project', msg: '올해 하반기 ITS 사업 입찰 준비 중입니다. 전체 컨설팅 진행 가능할까요?', status: 'confirmed' },
    { userIdx: 3, pkg: 'spot', msg: '제안서 발표 PT 준비 중인데 30분 코칭 받을 수 있나요?', status: 'completed' },
    { userIdx: 4, pkg: 'review', msg: '스마트시티 제안서 초안 리뷰 부탁드립니다. 50페이지 내외입니다.', status: 'pending' },
    { userIdx: 5, pkg: 'spot', msg: '원가계산서 작성법에 대해 상담 받고 싶습니다.', status: 'pending' },
    { userIdx: 6, pkg: 'project', msg: '내년도 정보보안 사업 입찰 전략부터 제안서 작성까지 풀 컨설팅 원합니다.', status: 'pending' },
    { userIdx: 7, pkg: 'review', msg: '교육플랫폼 제안서 평가항목별 점수 예측 부탁드립니다.', status: 'confirmed' },
    { userIdx: 8, pkg: 'spot', msg: '처음 공공입찰 참여하는데 준비해야 할 서류 목록 상담 받고 싶습니다.', status: 'completed' },
    { userIdx: 1, pkg: 'project', msg: '내년 지자체 홈페이지 고도화 사업에 참여하려 합니다. 전략 수립부터 도와주세요.', status: 'pending' },
  ]

  for (let i = 0; i < consultingData.length; i++) {
    const cd = consultingData[i]
    const user = userIds[cd.userIdx]
    if (!user) continue

    const daysAgo = Math.floor(Math.random() * 30) + 1
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()

    const res = await fetch(`${SUPABASE_URL}/rest/v1/consulting_requests`, {
      method: 'POST',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        company: user.company,
        package_type: cd.pkg,
        message: cd.msg,
        status: cd.status,
        created_at: createdAt,
      }),
    })

    if (res.ok) {
      const pkgLabel = { spot: '스팟상담', review: '제안서리뷰', project: '프로젝트컨설팅' }[cd.pkg]
      console.log(`✅ ${user.name} — ${pkgLabel} — ${cd.status}`)
    } else {
      const err = await res.json()
      console.log(`❌ ${user.name} — ${JSON.stringify(err)}`)
    }
  }

  console.log('\n=== 완료 ===')
  console.log(`회원 ${userIds.length}명, 주문 ${orderData.length}건, 상담 ${consultingData.length}건 생성`)
  console.log('비밀번호: Test123! (모든 테스트 계정)')
}

main().catch(console.error)
