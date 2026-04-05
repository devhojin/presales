import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 주문번호 생성: YYYYMMDD + 6자리 순번 (예: 20260403000001) */
export function generateOrderNumber(existingNumbers: string[]): string {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const dayStr = kst.getFullYear().toString() +
    String(kst.getMonth() + 1).padStart(2, '0') +
    String(kst.getDate()).padStart(2, '0')

  let maxSeq = 0
  for (const num of existingNumbers) {
    if (num.startsWith(dayStr) && num.length === 14) {
      const seq = parseInt(num.slice(8), 10)
      if (seq > maxSeq) maxSeq = seq
    }
  }

  return dayStr + String(maxSeq + 1).padStart(6, '0')
}
