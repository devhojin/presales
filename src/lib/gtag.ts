/**
 * Google Analytics 4 (gtag.js) utility functions
 * Use in client-side components only ('use client')
 */

import { GA_MEASUREMENT_ID } from '@/lib/constants'

type EventName =
  | 'product_view'
  | 'add_to_cart'
  | 'purchase'
  | 'download'
  | 'review_submit'
  | string

interface EventParams {
  [key: string]: string | number | boolean
}

/**
 * Track pageview in GA4
 * @param url - Page URL to track
 */
export function pageview(url: string) {
  if (typeof window === 'undefined' || !window.gtag) return
  if (!GA_MEASUREMENT_ID) return

  window.gtag('config', GA_MEASUREMENT_ID, {
    page_path: url,
  })
}

/**
 * Track custom event in GA4
 * @param action - Event action/name (e.g., 'add_to_cart')
 * @param category - Event category (e.g., 'engagement', 'purchase')
 * @param label - Event label (e.g., product name or description)
 * @param value - Event value (e.g., quantity, price)
 */
export function event(
  action: EventName,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window === 'undefined' || !window.gtag) return

  const params: EventParams = {
    event_category: category,
  }

  if (label) params.event_label = label
  if (value !== undefined) params.value = value

  window.gtag('event', action, params)
}

/**
 * Track product view event
 * @param productId - Product ID
 * @param productName - Product name
 * @param price - Product price (optional)
 */
export function trackProductView(
  productId: string,
  productName: string,
  price?: number
) {
  event('product_view', 'ecommerce', productName, price)
}

/**
 * Track add to cart event
 * @param productId - Product ID
 * @param productName - Product name
 * @param quantity - Quantity added (default: 1)
 */
export function trackAddToCart(
  productId: string,
  productName: string,
  quantity: number = 1
) {
  event('add_to_cart', 'ecommerce', productName, quantity)
}

/**
 * Track purchase event
 * @param transactionId - Transaction/Order ID
 * @param value - Total purchase amount
 * @param currency - Currency code (default: 'KRW')
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  currency: string = 'KRW'
) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'purchase', {
    transaction_id: transactionId,
    value: value,
    currency: currency,
    event_category: 'purchase',
  })
}

/**
 * Track file download event
 * @param fileName - Downloaded file name
 * @param fileType - File type (e.g., 'pdf', 'doc')
 */
export function trackDownload(fileName: string, fileType: string) {
  event('download', 'engagement', `${fileName}.${fileType}`)
}

/**
 * Track review submission event
 * @param productId - Product ID being reviewed
 * @param rating - Review rating (1-5)
 */
export function trackReviewSubmit(productId: string, rating: number) {
  event('review_submit', 'engagement', productId, rating)
}

/**
 * Track user engagement event
 * @param action - Action name
 * @param category - Action category
 * @param label - Optional label
 */
export function trackEngagement(
  action: string,
  category: string,
  label?: string
) {
  event(action, category, label)
}

// Extend window type for TypeScript
declare global {
  interface Window {
    gtag?: (command: string, id: string | object, config?: object) => void
    dataLayer?: unknown[]
  }
}
