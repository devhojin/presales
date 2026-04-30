/**
 * KISA 보안인증 기준 비밀번호 정책
 * - Supabase Auth 운영 정책에 맞춰 10자 이상 + 2종 조합
 * - 반복 문자 금지
 * - 알려진 약한 패턴 금지
 * - 이메일과 동일한 비밀번호 금지
 */

export interface PasswordCheck {
  valid: boolean
  score: number // 0-4
  label: string
  color: string
  errors: string[]
}

const SPECIAL_CHARS = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/
const WEAK_PASSWORD_PATTERNS = [
  'password',
  'passw0rd',
  'qwerty',
  'admin',
  'test',
  'welcome',
  'letmein',
  'iloveyou',
]

function hasUpperCase(s: string) { return /[A-Z]/.test(s) }
function hasLowerCase(s: string) { return /[a-z]/.test(s) }
function hasDigit(s: string) { return /[0-9]/.test(s) }
function hasSpecial(s: string) { return SPECIAL_CHARS.test(s) }

function countTypes(s: string): number {
  let count = 0
  if (hasUpperCase(s)) count++
  if (hasLowerCase(s)) count++
  if (hasDigit(s)) count++
  if (hasSpecial(s)) count++
  return count
}

function hasRepeating(s: string): boolean {
  for (let i = 0; i < s.length - 2; i++) {
    if (s[i] === s[i + 1] && s[i + 1] === s[i + 2]) return true
  }
  return false
}

function hasKnownWeakPattern(s: string): boolean {
  const normalized = s.toLowerCase()
  return WEAK_PASSWORD_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export function validatePassword(password: string, email?: string): PasswordCheck {
  const errors: string[] = []

  if (!password) {
    return { valid: false, score: 0, label: '', color: 'bg-gray-200', errors: ['비밀번호를 입력해주세요.'] }
  }

  if (password.length < 10) {
    errors.push('최소 10자 이상이어야 합니다.')
  }

  const types = countTypes(password)
  if (types < 2) {
    errors.push('10자 이상은 2종 이상 조합이 필요합니다.')
  }

  if (hasRepeating(password)) {
    errors.push('같은 문자 3회 이상 반복은 사용할 수 없습니다.')
  }

  if (hasKnownWeakPattern(password)) {
    errors.push('Test, password, admin처럼 흔하거나 추측하기 쉬운 단어는 사용할 수 없습니다.')
  }

  if (email) {
    const emailLocal = email.split('@')[0].toLowerCase()
    if (emailLocal && password.toLowerCase().includes(emailLocal)) {
      errors.push('이메일 주소를 포함한 비밀번호는 사용할 수 없습니다.')
    }
  }

  const valid = errors.length === 0

  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (types >= 3) score++
  if (types >= 4 && password.length >= 12) score++

  const labels = ['매우 약함', '약함', '보통', '강함', '매우 강함']
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

  return { valid, score, label: labels[score], color: colors[score], errors }
}

/** 로그인 시도 제한 (KISA: 5회 이하, 서버사이드 — profiles 테이블 기반) */

export interface LockCheckResult {
  locked: boolean
  remainingMinutes: number
  failedCount: number
}

export interface RecordFailureResult {
  locked: boolean
  attemptsLeft: number
}

/**
 * 서버에 로그인 잠금 상태를 조회합니다.
 * GET /api/auth/login-attempt?email=...
 */
export async function checkLoginLock(email: string): Promise<LockCheckResult> {
  try {
    const res = await fetch(
      `/api/auth/login-attempt?email=${encodeURIComponent(email)}`,
      { method: 'GET' }
    )
    if (!res.ok) return { locked: false, remainingMinutes: 0, failedCount: 0 }
    return (await res.json()) as LockCheckResult
  } catch {
    // 네트워크 오류 시 잠금 없음으로 폴백 (가용성 우선)
    return { locked: false, remainingMinutes: 0, failedCount: 0 }
  }
}

/**
 * 로그인 실패를 서버에 기록합니다.
 * POST /api/auth/login-attempt  { email }
 */
export async function recordLoginFailure(email: string): Promise<RecordFailureResult> {
  try {
    const res = await fetch('/api/auth/login-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (!res.ok) return { locked: false, attemptsLeft: 4 }
    return (await res.json()) as RecordFailureResult
  } catch {
    return { locked: false, attemptsLeft: 4 }
  }
}

/**
 * 로그인 성공 시 잠금 카운터를 초기화합니다.
 * DELETE /api/auth/login-attempt  { email }
 */
export async function resetLoginAttempts(email: string): Promise<void> {
  try {
    await fetch('/api/auth/login-attempt', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
  } catch {
    // 초기화 실패는 무시 (다음 성공 로그인 시 재시도됨)
  }
}
