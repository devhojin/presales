/**
 * 인메모리 슬라이딩 윈도우 Rate Limiter
 *
 * Vercel serverless 환경에서 함수 인스턴스 수명만큼 유효.
 * 외부 패키지 없이 순수 TypeScript로 구현.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

// 전역 Map (모듈 수준 — 같은 함수 인스턴스 내에서 공유)
const store = new Map<string, RateLimitEntry>()

// 오래된 엔트리 cleanup (만료된 윈도우 제거)
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key)
    }
  }
}

// 일정 주기로 cleanup 실행 (100회 호출마다)
let callCount = 0
const CLEANUP_INTERVAL = 100

/**
 * Rate limit 체크
 *
 * @param key      - IP 또는 사용자 ID
 * @param limit    - 윈도우 내 최대 허용 요청 수
 * @param windowMs - 슬라이딩 윈도우 크기 (밀리초)
 * @returns        - { allowed, remaining, resetAt }
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  callCount++
  if (callCount % CLEANUP_INTERVAL === 0) {
    cleanup()
  }

  const now = Date.now()
  const existing = store.get(key)

  // 엔트리가 없거나 윈도우가 만료된 경우 → 새 윈도우 시작
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  // 윈도우 내 요청 수 초과
  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  // 카운트 증가
  existing.count++
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}
