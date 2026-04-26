/**
 * Open-redirect 방지: 외부 URL 로 튀는 리다이렉트를 차단한다.
 *
 * 허용되는 값:
 *   - '/' 로 시작하는 내부 경로 (ex. '/mypage', '/cart')
 *
 * 차단되는 값:
 *   - null / 빈 문자열 / 상대 경로 → fallback
 *   - '//evil.com' / '/\\evil.com' → 브라우저가 protocol-relative 로 해석
 *   - 'javascript:' / 'data:' / 'vbscript:' scheme
 *   - 'http://' / 'https://' 절대 URL
 */
export function sanitizeRedirect(
  raw: string | null | undefined,
  fallback: string = '/mypage',
): string {
  if (!raw) return fallback
  if (typeof raw !== 'string') return fallback
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback
  if (/^\s*(javascript|data|vbscript):/i.test(raw)) return fallback
  return raw
}
