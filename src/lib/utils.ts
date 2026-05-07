import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function randomInt(maxExclusive: number) {
  const cryptoApi = globalThis.crypto
  if (cryptoApi?.getRandomValues) {
    const bucketSize = Math.floor(0x100000000 / maxExclusive) * maxExclusive
    const value = new Uint32Array(1)

    do {
      cryptoApi.getRandomValues(value)
    } while (value[0] >= bucketSize)

    return value[0] % maxExclusive
  }

  return Math.floor(Math.random() * maxExclusive)
}

/** 주문번호 생성: 14자리 숫자 난수. 순번과 생성일을 노출하지 않는다. */
export function generateOrderNumber(): string {
  const digits = [String(randomInt(9) + 1)]

  while (digits.length < 14) {
    digits.push(String(randomInt(10)))
  }

  return digits.join('')
}
