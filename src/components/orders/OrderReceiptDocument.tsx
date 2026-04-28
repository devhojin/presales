import type { ReactNode } from 'react'

export interface ReceiptProduct {
  id?: number
  title?: string | null
  price?: number | null
}

export interface ReceiptOrderItem {
  id: number
  price: number
  original_price?: number | null
  discount_amount?: number | null
  discount_reason?: string | null
  discount_source_product_id?: number | null
  discount_source_product?: ReceiptProduct | null
  products: ReceiptProduct | ReceiptProduct[] | null
}

export interface ReceiptOrder {
  id: number
  order_number?: string | null
  total_amount: number
  status: string
  created_at: string
  paid_at?: string | null
  payment_method?: string | null
  cash_receipt_url?: string | null
  coupon_discount?: number | null
  reward_discount?: number | null
  order_items?: ReceiptOrderItem[]
}

export interface ReceiptProfile {
  name?: string | null
  email?: string | null
  phone?: string | null
  company?: string | null
}

interface OrderReceiptDocumentProps {
  order: ReceiptOrder
  profile?: ReceiptProfile | null
  className?: string
}

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: '카드',
  CARD: '카드',
  easy_pay: '간편결제',
  TRANSFER: '계좌이체',
  VIRTUAL_ACCOUNT: '가상계좌',
  bank_transfer: '무통장입금',
  free: '무료 주문',
  reward: '적립금',
}

const RECEIPT_SITE_URL = 'https://www.presales.co.kr'
const ADMIN_DISPLAY_EMAIL = 'sales@presales.co.kr'

function getProduct(item: ReceiptOrderItem): ReceiptProduct | null {
  return Array.isArray(item.products) ? item.products[0] ?? null : item.products
}

function getDiscountSourceProduct(item: ReceiptOrderItem): ReceiptProduct | null {
  return item.discount_source_product ?? null
}

function isPaid(order: ReceiptOrder): boolean {
  return order.status === 'paid' || order.status === 'completed'
}

function formatWon(value: number | null | undefined): string {
  return `${new Intl.NumberFormat('ko-KR').format(value ?? 0)}원`
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return '결제수단 확인 중'
  return PAYMENT_METHOD_LABEL[method] ?? method
}

function displayReceiptEmail(email: string | null | undefined): string | null {
  if (!email) return null
  return email === 'admin@amarans.co.kr' ? ADMIN_DISPLAY_EMAIL : email
}

function receiptNumber(order: ReceiptOrder): string {
  return order.order_number || `PS-${String(order.id).padStart(6, '0')}`
}

function getOrderItems(order: ReceiptOrder): ReceiptOrderItem[] {
  return order.order_items ?? []
}

function getSubtotal(order: ReceiptOrder): number {
  const items = getOrderItems(order)
  if (items.length === 0) return order.total_amount ?? 0
  return items.reduce((sum, item) => {
    const listPrice = item.original_price && item.original_price > item.price ? item.original_price : item.price
    return sum + listPrice
  }, 0)
}

function getDiscountTotal(order: ReceiptOrder): number {
  return getOrderItems(order).reduce((sum, item) => sum + (item.discount_amount ?? 0), 0)
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[112px_1fr] gap-2 text-[13px] leading-relaxed">
      <dt className="font-semibold text-neutral-950">{label}</dt>
      <dd className="text-neutral-800">{value}</dd>
    </div>
  )
}

export function OrderReceiptDocument({ order, profile, className = '' }: OrderReceiptDocumentProps) {
  const items = getOrderItems(order)
  const paid = isPaid(order)
  const subtotal = getSubtotal(order)
  const discountTotal = getDiscountTotal(order)
  const couponDiscount = Math.max(0, Number(order.coupon_discount ?? 0))
  const rewardDiscount = Math.max(0, Number(order.reward_discount ?? 0))
  const displayDate = order.paid_at || order.created_at
  const buyerName = profile?.company || profile?.name || '구매자'
  const buyerEmail = displayReceiptEmail(profile?.email)
  const receiptId = receiptNumber(order)

  return (
    <article className={`bg-white text-neutral-950 shadow-sm print:shadow-none ${className}`}>
      <div className="mx-auto w-full max-w-[920px] px-6 py-8 sm:px-10 sm:py-10">
        <header className="flex items-start justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-normal text-neutral-950 sm:text-4xl">Receipt</h2>
            <dl className="mt-7 space-y-0.5">
              <MetaRow label="Invoice number" value={receiptId} />
              <MetaRow label="Receipt number" value={`PS-${String(order.id).padStart(4, '0')}`} />
              <MetaRow label="Date paid" value={paid ? formatDate(displayDate) : '입금 대기'} />
            </dl>
          </div>
          <div className="select-none text-4xl font-black tracking-normal text-neutral-950 sm:text-5xl">PS</div>
        </header>

        <section className="mt-8 grid gap-8 sm:grid-cols-2">
          <address className="not-italic text-[15px] leading-relaxed text-neutral-800">
            <p className="font-semibold text-neutral-950">PRESALES by AMARANS</p>
            <p>공공조달 제안서 마켓플레이스</p>
            <p>help@presales.co.kr</p>
            <p>{RECEIPT_SITE_URL}</p>
          </address>

          <address className="not-italic text-[15px] leading-relaxed text-neutral-800">
            <p className="font-semibold text-neutral-950">Bill to</p>
            <p>{buyerName}</p>
            {profile?.name && profile.company && <p>{profile.name}</p>}
            {buyerEmail && <p>{buyerEmail}</p>}
            {profile?.phone && <p>{profile.phone}</p>}
          </address>
        </section>

        <section className="mt-9">
          <p className="text-2xl font-bold tracking-normal text-neutral-950">
            {formatWon(order.total_amount)} {paid ? `paid on ${formatDate(displayDate)}` : 'waiting for deposit'}
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-neutral-700">
            본 문서는 PRESALES 주문 확인용 거래 문서입니다. 세금계산서 또는 현금영수증은 결제수단과 신청 정보에 따라 별도로 발급됩니다.
          </p>
        </section>

        <section className="mt-11 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-950 text-xs font-medium text-neutral-700">
                <th className="py-3 pr-4 font-medium">Description</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                <th className="px-4 py-3 text-right font-medium">Discount</th>
                <th className="py-3 pl-4 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item) => {
                  const product = getProduct(item)
                  const discountSourceProduct = getDiscountSourceProduct(item)
                  const unitPrice = item.original_price && item.original_price > item.price ? item.original_price : item.price
                  const discount = item.discount_amount ?? 0
                  return (
                    <tr key={item.id} className="border-b border-neutral-200">
                      <td className="py-3 pr-4 text-neutral-950">
                        <p>{product?.title || 'PRESALES 문서 상품'}</p>
                        {discount > 0 && (discountSourceProduct || item.discount_source_product_id) && (
                          <div className="mt-1.5 rounded-md border border-blue-100 bg-blue-50 px-2 py-1.5 text-[11px] leading-relaxed text-blue-800">
                            <p className="font-semibold">구매한 상품</p>
                            <p>{discountSourceProduct?.title || `상품 #${item.discount_source_product_id}`}</p>
                            <p className="text-blue-700">이 구매 이력으로 {formatWon(discount)} 차감되었습니다.</p>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-800">1</td>
                      <td className="px-4 py-3 text-right text-neutral-800">{formatWon(unitPrice)}</td>
                      <td className="px-4 py-3 text-right text-neutral-800">
                        {discount > 0 ? `-${formatWon(discount)}` : '-'}
                      </td>
                      <td className="py-3 pl-4 text-right font-medium text-neutral-950">{formatWon(item.price)}</td>
                    </tr>
                  )
                })
              ) : (
                <tr className="border-b border-neutral-200">
                  <td className="py-3 pr-4 text-neutral-950">PRESALES 주문</td>
                  <td className="px-4 py-3 text-right text-neutral-800">1</td>
                  <td className="px-4 py-3 text-right text-neutral-800">{formatWon(order.total_amount)}</td>
                  <td className="px-4 py-3 text-right text-neutral-800">-</td>
                  <td className="py-3 pl-4 text-right font-medium text-neutral-950">{formatWon(order.total_amount)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-7 ml-auto w-full max-w-md text-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 py-1.5">
            <span className="text-neutral-800">Subtotal</span>
            <span>{formatWon(subtotal)}</span>
          </div>
          {discountTotal > 0 && (
            <div className="flex items-center justify-between border-b border-neutral-200 py-1.5">
              <span className="text-neutral-800">Discount</span>
              <span>-{formatWon(discountTotal)}</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div className="flex items-center justify-between border-b border-neutral-200 py-1.5">
              <span className="text-neutral-800">Coupon</span>
              <span>-{formatWon(couponDiscount)}</span>
            </div>
          )}
          {rewardDiscount > 0 && (
            <div className="flex items-center justify-between border-b border-neutral-200 py-1.5">
              <span className="text-neutral-800">Reward points</span>
              <span>-{formatWon(rewardDiscount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-neutral-200 py-1.5">
            <span className="text-neutral-800">Total</span>
            <span>{formatWon(order.total_amount)}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 font-bold">
            <span>{paid ? 'Amount paid' : 'Amount due'}</span>
            <span>{formatWon(order.total_amount)}</span>
          </div>
        </section>

        <section className="mt-10">
          <h3 className="text-xl font-bold tracking-normal text-neutral-950">Payment history</h3>
          <table className="mt-6 w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-950 text-xs font-medium text-neutral-700">
                <th className="py-3 pr-4 font-medium">Payment method</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">{paid ? 'Amount paid' : 'Amount due'}</th>
                <th className="py-3 pl-4 text-right font-medium">Receipt number</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="py-3 pr-4 text-neutral-950">{paymentMethodLabel(order.payment_method)}</td>
                <td className="px-4 py-3 text-neutral-800">{formatDateTime(displayDate)}</td>
                <td className="px-4 py-3 text-right text-neutral-950">{formatWon(order.total_amount)}</td>
                <td className="py-3 pl-4 text-right font-mono text-xs text-neutral-800">{receiptId}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {order.cash_receipt_url && (
          <p className="mt-6 text-sm text-neutral-700">
            현금영수증 확인: <a className="font-medium underline underline-offset-4" href={order.cash_receipt_url} target="_blank" rel="noopener noreferrer">발급 내역 열기</a>
          </p>
        )}
      </div>
    </article>
  )
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function buildReceiptPrintHtml(order: ReceiptOrder, profile?: ReceiptProfile | null): string {
  const items = getOrderItems(order)
  const paid = isPaid(order)
  const displayDate = order.paid_at || order.created_at
  const subtotal = getSubtotal(order)
  const discountTotal = getDiscountTotal(order)
  const couponDiscount = Math.max(0, Number(order.coupon_discount ?? 0))
  const rewardDiscount = Math.max(0, Number(order.reward_discount ?? 0))
  const buyerName = profile?.company || profile?.name || '구매자'
  const buyerEmail = displayReceiptEmail(profile?.email)
  const receiptId = receiptNumber(order)
  const rows = (items.length > 0 ? items : [{
    id: order.id,
    price: order.total_amount,
    original_price: order.total_amount,
    discount_amount: 0,
    products: { title: 'PRESALES 주문' },
  }]).map((item) => {
    const product = getProduct(item)
    const discountSourceProduct = getDiscountSourceProduct(item)
    const unitPrice = item.original_price && item.original_price > item.price ? item.original_price : item.price
    const discount = item.discount_amount ?? 0
    const discountSourceHtml = discount > 0 && (discountSourceProduct || item.discount_source_product_id)
      ? `<div class="discount-source"><strong>구매한 상품</strong><br>${escapeHtml(discountSourceProduct?.title || `상품 #${item.discount_source_product_id}`)}<br><span>이 구매 이력으로 ${formatWon(discount)} 차감되었습니다.</span></div>`
      : ''
    return `
      <tr>
        <td>${escapeHtml(product?.title || 'PRESALES 문서 상품')}${discountSourceHtml}</td>
        <td class="num">1</td>
        <td class="num">${formatWon(unitPrice)}</td>
        <td class="num">${discount > 0 ? `-${formatWon(discount)}` : '-'}</td>
        <td class="num strong">${formatWon(item.price)}</td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>Receipt ${escapeHtml(receiptId)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; background: #f4f4f5; color: #0a0a0a; font-family: Arial, "Malgun Gothic", sans-serif; }
    .page { max-width: 920px; margin: 24px auto; background: #fff; padding: 44px; }
    .top { display: flex; justify-content: space-between; gap: 32px; }
    h1 { margin: 0; font-size: 42px; line-height: 1; letter-spacing: 0; }
    .mark { font-size: 54px; font-weight: 900; line-height: 1; }
    dl { margin: 28px 0 0; }
    .meta { display: grid; grid-template-columns: 122px 1fr; gap: 8px; font-size: 14px; line-height: 1.5; }
    dt { font-weight: 700; }
    dd { margin: 0; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; margin-top: 42px; font-size: 15px; line-height: 1.55; }
    .cols p { margin: 0; }
    .label { font-weight: 700; color: #0a0a0a; }
    .paid { margin-top: 42px; font-size: 25px; font-weight: 800; }
    .note { max-width: 680px; margin-top: 16px; font-size: 14px; line-height: 1.6; color: #404040; }
    .discount-source { margin-top: 8px; border: 1px solid #bfdbfe; background: #eff6ff; color: #1e40af; padding: 7px 9px; border-radius: 6px; font-size: 11px; line-height: 1.45; }
    .discount-source strong { color: #1e3a8a; }
    .discount-source span { color: #1d4ed8; }
    table { width: 100%; border-collapse: collapse; margin-top: 44px; font-size: 14px; }
    th { border-bottom: 1.5px solid #0a0a0a; padding: 12px 10px; color: #404040; font-size: 12px; font-weight: 500; }
    td { border-bottom: 1px solid #e5e5e5; padding: 13px 10px; }
    .num { text-align: right; white-space: nowrap; }
    .strong { font-weight: 700; }
    .summary { max-width: 420px; margin: 28px 0 0 auto; font-size: 14px; }
    .summary div { display: flex; justify-content: space-between; border-bottom: 1px solid #e5e5e5; padding: 7px 0; }
    .summary .total { font-weight: 800; border-bottom: 0; }
    h2 { margin: 44px 0 0; font-size: 24px; }
    .actions { margin-top: 28px; text-align: center; }
    button { cursor: pointer; border: 1px solid #0a0a0a; background: #fff; padding: 10px 24px; border-radius: 4px; font-weight: 700; }
    @media print {
      body { background: #fff; }
      .page { margin: 0; padding: 0; max-width: none; }
      .actions { display: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <h1>Receipt</h1>
        <dl>
          <div class="meta"><dt>Invoice number</dt><dd>${escapeHtml(receiptId)}</dd></div>
          <div class="meta"><dt>Receipt number</dt><dd>PS-${String(order.id).padStart(4, '0')}</dd></div>
          <div class="meta"><dt>Date paid</dt><dd>${paid ? formatDate(displayDate) : '입금 대기'}</dd></div>
        </dl>
      </div>
      <div class="mark">PS</div>
    </section>

    <section class="cols">
      <div>
        <p class="label">PRESALES by AMARANS</p>
        <p>공공조달 제안서 마켓플레이스</p>
        <p>help@presales.co.kr</p>
        <p>${RECEIPT_SITE_URL}</p>
      </div>
      <div>
        <p class="label">Bill to</p>
        <p>${escapeHtml(buyerName)}</p>
        ${profile?.name && profile.company ? `<p>${escapeHtml(profile.name)}</p>` : ''}
        ${buyerEmail ? `<p>${escapeHtml(buyerEmail)}</p>` : ''}
        ${profile?.phone ? `<p>${escapeHtml(profile.phone)}</p>` : ''}
      </div>
    </section>

    <p class="paid">${formatWon(order.total_amount)} ${paid ? `paid on ${formatDate(displayDate)}` : 'waiting for deposit'}</p>
    <p class="note">본 문서는 PRESALES 주문 확인용 거래 문서입니다. 세금계산서 또는 현금영수증은 결제수단과 신청 정보에 따라 별도로 발급됩니다.</p>

    <table>
      <thead>
        <tr>
          <th style="text-align:left">Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit price</th>
          <th class="num">Discount</th>
          <th class="num">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <section class="summary">
      <div><span>Subtotal</span><span>${formatWon(subtotal)}</span></div>
      ${discountTotal > 0 ? `<div><span>Discount</span><span>-${formatWon(discountTotal)}</span></div>` : ''}
      ${couponDiscount > 0 ? `<div><span>Coupon</span><span>-${formatWon(couponDiscount)}</span></div>` : ''}
      ${rewardDiscount > 0 ? `<div><span>Reward points</span><span>-${formatWon(rewardDiscount)}</span></div>` : ''}
      <div><span>Total</span><span>${formatWon(order.total_amount)}</span></div>
      <div class="total"><span>${paid ? 'Amount paid' : 'Amount due'}</span><span>${formatWon(order.total_amount)}</span></div>
    </section>

    <h2>Payment history</h2>
    <table>
      <thead>
        <tr>
          <th style="text-align:left">Payment method</th>
          <th style="text-align:left">Date</th>
          <th class="num">${paid ? 'Amount paid' : 'Amount due'}</th>
          <th class="num">Receipt number</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${escapeHtml(paymentMethodLabel(order.payment_method))}</td>
          <td>${escapeHtml(formatDateTime(displayDate))}</td>
          <td class="num">${formatWon(order.total_amount)}</td>
          <td class="num">${escapeHtml(receiptId)}</td>
        </tr>
      </tbody>
    </table>

    <div class="actions"><button onclick="window.print()">인쇄</button></div>
  </main>
</body>
</html>`
}
