/**
 * Rate Limiter — Upstash Redis(분산) + 인메모리 fallback
 *
 * - UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN 가 설정되면 Redis 사용
 *   (멀티 인스턴스 환경에서 일관된 제한)
 * - env 없으면 인메모리로 fallback (개발/단일 인스턴스 호환성)
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/* ---------- 인메모리 fallback ---------- */
interface MemEntry {
  count: number
  resetAt: number
}

const memStore = new Map<string, MemEntry>()
let callCount = 0

function memCheck(key: string, limit: number, windowMs: number): RateLimitResult {
  callCount++
  if (callCount % 100 === 0) {
    const now = Date.now()
    for (const [k, v] of memStore.entries()) {
      if (v.resetAt <= now) memStore.delete(k)
    }
  }

  const now = Date.now()
  const existing = memStore.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowMs
    memStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: limit - 1, resetAt }
  }

  if (existing.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: limit - existing.count, resetAt: existing.resetAt }
}

/* ---------- Upstash Redis (있을 때만 사용) ---------- */
const hasUpstash = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)

const redis = hasUpstash
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null

// (limit, windowMs) 조합별로 Ratelimit 인스턴스 캐시
const limiterCache = new Map<string, Ratelimit>()

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null
  const cacheKey = `${limit}:${windowMs}`
  let limiter = limiterCache.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
      prefix: 'presales:rl',
    })
    limiterCache.set(cacheKey, limiter)
  }
  return limiter
}

/**
 * Rate limit 체크 — 동기/비동기 혼용을 위해 Promise 반환
 * 기존 호출부 호환: `const rl = checkRateLimit(...)` 가 이미 `rl.allowed` 로 접근하므로
 * 비동기 전환 필요. 후방 호환을 위해 sync 함수는 인메모리로만 유지하고,
 * Upstash 사용을 원하면 `checkRateLimitAsync` 를 await 로 호출.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return memCheck(key, limit, windowMs)
}

/** 권장: 분산 rate limit (Upstash 있으면 Redis, 없으면 인메모리) */
export async function checkRateLimitAsync(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const limiter = getLimiter(limit, windowMs)
  if (!limiter) return memCheck(key, limit, windowMs)

  try {
    const { success, remaining, reset } = await limiter.limit(key)
    return { allowed: success, remaining, resetAt: reset }
  } catch {
    // Redis 장애 시 인메모리로 degrade (사이트 다운 방지)
    return memCheck(key, limit, windowMs)
  }
}
