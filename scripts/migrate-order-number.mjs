const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndW1qcWFsb3Fkdnhwc2xic2JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MjQzOCwiZXhwIjoyMDg5ODY4NDM4fQ.KCBuPLhMAPMCpvIyQF0yLrgypiYrkeZ3olacu6ERb1s'
const BASE = 'https://egumjqaloqdvxpslbsba.supabase.co'
const headers = { 'apikey': SRK, 'Authorization': `Bearer ${SRK}`, 'Content-Type': 'application/json' }

// Step 1: DB 트리거 생성 (주문번호 자동생성)
const triggerSQL = `
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
  today_str TEXT;
  max_seq INT;
  new_seq TEXT;
BEGIN
  today_str := TO_CHAR(NOW() AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD');

  SELECT COALESCE(MAX(CAST(RIGHT(order_number, 6) AS INT)), 0)
  INTO max_seq
  FROM orders
  WHERE order_number LIKE today_str || '%'
    AND LENGTH(order_number) = 14;

  new_seq := LPAD((max_seq + 1)::TEXT, 6, '0');
  NEW.order_number := today_str || new_seq;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_generate_order_number ON orders;

CREATE TRIGGER trg_generate_order_number
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_number();
`

// Step 2: 기존 주문의 order_number를 새 형식으로 변환
const updateSQL = `
WITH ranked AS (
  SELECT id,
         TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD') AS day_str,
         ROW_NUMBER() OVER (
           PARTITION BY TO_CHAR(created_at AT TIME ZONE 'Asia/Seoul', 'YYYYMMDD')
           ORDER BY created_at, id
         ) AS seq
  FROM orders
)
UPDATE orders
SET order_number = ranked.day_str || LPAD(ranked.seq::TEXT, 6, '0')
FROM ranked
WHERE orders.id = ranked.id;
`

async function runSQL(sql, label) {
  const res = await fetch(`${BASE}/rest/v1/rpc/`, {
    method: 'POST',
    headers,
    body: JSON.stringify({}),
  })
  // REST API에서 raw SQL 실행은 불가 → pg_net 또는 management API 사용
  // Supabase Management API로 SQL 직접 실행
  const mgmtRes = await fetch(`https://api.supabase.com/v1/projects/egumjqaloqdvxpslbsba/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SRK}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  if (!mgmtRes.ok) {
    // Management API 안 되면 postgREST SQL function 사용
    return false
  }
  const result = await mgmtRes.json()
  console.log(`✅ ${label} 완료:`, result)
  return true
}

async function main() {
  console.log('=== 주문번호 체계 변경 (YYYYMMDD + 6자리 순번) ===\n')

  // 기존 주문 조회
  const ordersRes = await fetch(`${BASE}/rest/v1/orders?select=id,order_number,created_at&order=created_at.asc`, { headers })
  const orders = await ordersRes.json()
  console.log(`기존 주문 ${orders.length}건 발견\n`)

  // 날짜별 순번 매기기
  const dayCounters = {}
  const updates = []

  for (const order of orders) {
    const d = new Date(order.created_at)
    // KST 변환
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
    const dayStr = kst.getFullYear().toString() +
      String(kst.getMonth() + 1).padStart(2, '0') +
      String(kst.getDate()).padStart(2, '0')

    if (!dayCounters[dayStr]) dayCounters[dayStr] = 0
    dayCounters[dayStr]++

    const newNumber = dayStr + String(dayCounters[dayStr]).padStart(6, '0')
    updates.push({ id: order.id, old: order.order_number, new: newNumber })
  }

  // 하나씩 업데이트 (UNIQUE 제약 충돌 방지를 위해 임시로 tmp_ 접두사)
  console.log('1단계: 임시 번호로 변경...')
  for (const u of updates) {
    await fetch(`${BASE}/rest/v1/orders?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ order_number: 'tmp_' + u.new }),
    })
  }

  console.log('2단계: 최종 번호로 변경...')
  for (const u of updates) {
    await fetch(`${BASE}/rest/v1/orders?id=eq.${u.id}`, {
      method: 'PATCH',
      headers: { ...headers, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ order_number: u.new }),
    })
  }

  console.log(`\n✅ ${updates.length}건 주문번호 변경 완료!`)
  console.log('\n변경 내역 (처음 10건):')
  for (const u of updates.slice(0, 10)) {
    console.log(`  ${u.old} → ${u.new}`)
  }
  if (updates.length > 10) console.log(`  ... 외 ${updates.length - 10}건`)

  console.log('\n⚠️ DB 트리거는 Supabase SQL Editor에서 직접 실행해주세요:')
  console.log(triggerSQL)
}

main().catch(console.error)
