import { SITE_URL } from '@/lib/constants'
import { escapeHtml } from '@/lib/html-escape'

export interface OrderEmailItem {
  product_id: number | string | null
  price: number
  products: { title: string | null } | null
}

export function buildOrderItemRows(
  items: OrderEmailItem[],
  formatAmount: (amount: number) => string,
): string {
  return items
    .map((item) => {
      const title = escapeHtml(item.products?.title || '(상품명 없음)')
      const productId = Number(item.product_id)
      const titleHtml = Number.isInteger(productId) && productId > 0
        ? `<a href="${escapeHtml(`${SITE_URL}/store/${productId}`)}" target="_blank" rel="noopener noreferrer" style="color:#1e40af;text-decoration:none;font-weight:600;">${title}</a>`
        : title

      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">
            ${titleHtml}
          </td>
          <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;text-align:right;white-space:nowrap;">
            ${formatAmount(Number(item.price || 0))}
          </td>
        </tr>`
    })
    .join('')
}
