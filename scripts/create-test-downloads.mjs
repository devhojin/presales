const SRK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVndW1qcWFsb3Fkdnhwc2xic2JhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5MjQzOCwiZXhwIjoyMDg5ODY4NDM4fQ.KCBuPLhMAPMCpvIyQF0yLrgypiYrkeZ3olacu6ERb1s'
const BASE = 'https://egumjqaloqdvxpslbsba.supabase.co'
const headers = { 'apikey': SRK, 'Authorization': `Bearer ${SRK}`, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }

async function main() {
  // Get paid orders with items
  const ordersRes = await fetch(`${BASE}/rest/v1/orders?status=eq.paid&select=id,user_id,order_items(product_id,products(title))`, { headers: { ...headers, 'Prefer': 'return=representation' } })
  const orders = await ordersRes.json()

  let count = 0
  for (const order of orders) {
    if (!order.order_items) continue
    for (const item of order.order_items) {
      // 1~3 downloads per purchased item
      const downloads = Math.floor(Math.random() * 3) + 1
      for (let i = 0; i < downloads; i++) {
        const daysAgo = Math.floor(Math.random() * 30)
        const hoursAgo = Math.floor(Math.random() * 24)
        const downloadedAt = new Date(Date.now() - daysAgo * 86400000 - hoursAgo * 3600000).toISOString()

        await fetch(`${BASE}/rest/v1/download_logs`, {
          method: 'POST', headers,
          body: JSON.stringify({
            user_id: order.user_id,
            product_id: item.product_id,
            file_name: item.products?.title || `product-${item.product_id}`,
            downloaded_at: downloadedAt,
          }),
        })
        count++
      }
    }
  }
  
  // Update product download counts
  const logsRes = await fetch(`${BASE}/rest/v1/download_logs?select=product_id`, { headers: { ...headers, 'Prefer': 'return=representation' } })
  const logs = await logsRes.json()
  const countMap = {}
  logs.forEach(l => { countMap[l.product_id] = (countMap[l.product_id] || 0) + 1 })
  
  for (const [pid, cnt] of Object.entries(countMap)) {
    await fetch(`${BASE}/rest/v1/products?id=eq.${pid}`, {
      method: 'PATCH', headers,
      body: JSON.stringify({ download_count: cnt }),
    })
  }

  console.log(`✅ ${count}건 다운로드 로그 생성, ${Object.keys(countMap).length}개 상품 카운트 업데이트`)
}
main().catch(console.error)
