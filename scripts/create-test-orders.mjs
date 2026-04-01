const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndW1qcWFsb3Fkdnhwc2xic2JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MjQzOCwiZXhwIjoyMDg5ODY4NDM4fQ.KCBuPLhMAPMCpvIyQF0yLrgypiYrkeZ3olacu6ERb1s'
const BASE = 'https://egumjqaloqdvxpslbsba.supabase.co'
const headers = { 'apikey': SRK, 'Authorization': `Bearer ${SRK}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

async function main() {
  const usersRes = await fetch(`${BASE}/rest/v1/profiles?select=id,name,email&limit=10`, { headers })
  const users = await usersRes.json()
  console.log('Users:', users.length)

  const prodsRes = await fetch(`${BASE}/rest/v1/products?is_published=eq.true&price=gt.0&select=id,title,price&limit=46`, { headers })
  const products = await prodsRes.json()
  console.log('Paid products:', products.length)

  const statuses = ['paid', 'paid', 'paid', 'paid', 'pending', 'cancelled', 'refunded']
  const methods = ['카드', '카카오페이', '네이버페이', '카드', '토스페이']

  let created = 0
  for (let i = 0; i < 50; i++) {
    const user = users[Math.floor(Math.random() * users.length)]
    if (!user) continue

    const numItems = Math.floor(Math.random() * 3) + 1
    const items = []
    const usedIds = new Set()
    for (let j = 0; j < numItems; j++) {
      let prod
      do { prod = products[Math.floor(Math.random() * products.length)] } while (usedIds.has(prod.id))
      usedIds.add(prod.id)
      items.push(prod)
    }

    const total = items.reduce((s, p) => s + p.price, 0)
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const method = methods[Math.floor(Math.random() * methods.length)]
    const daysAgo = Math.floor(Math.random() * 60) + 1
    const createdAt = new Date(Date.now() - daysAgo * 86400000).toISOString()
    const orderNum = `ORD-${Date.now().toString().slice(-10)}${String(i).padStart(3, '0')}`

    const orderRes = await fetch(`${BASE}/rest/v1/orders`, {
      method: 'POST', headers,
      body: JSON.stringify({
        order_number: orderNum, user_id: user.id, status, total_amount: total,
        payment_method: method,
        paid_at: status === 'paid' ? createdAt : null,
        cancelled_at: (status === 'cancelled' || status === 'refunded') ? createdAt : null,
        created_at: createdAt,
      }),
    })
    const orderData = await orderRes.json()
    const orderId = orderData[0]?.id

    if (orderId) {
      for (const prod of items) {
        await fetch(`${BASE}/rest/v1/order_items`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ order_id: orderId, product_id: prod.id, price: prod.price }),
        })
      }
      created++
      const statusLabel = { paid: '결제완료', pending: '대기', cancelled: '취소', refunded: '환불' }[status]
      if (created % 10 === 0) console.log(`${created}건 생성... (${user.name} - ${statusLabel} - ${total.toLocaleString()}원)`)
    }
  }
  console.log(`\n✅ 총 ${created}건 주문 생성 완료`)
}
main().catch(console.error)
