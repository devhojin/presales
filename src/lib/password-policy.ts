/**
 * KISA 보안인증 기준 비밀번호 정책
 * - 8자 이상 + 3종 조합 (영대문자, 영소문자, 숫자, 특수문자 중 3종)
 * - 또는 10자 이상 + 2종 조합
 * - 연속/반복 문자 금지
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

function hasSequential(s: string): boolean {
  const lower = s.toLowerCase()
  for (let i = 0; i < lower.length - 2; i++) {
    const c1 = lower.charCodeAt(i)
    const c2 = lower.charCodeAt(i + 1)
    const c3 = lower.charCodeAt(i + 2)
    if (c2 === c1 + 1 && c3 === c2 + 1) return true
    if (c2 === c1 - 1 && c3 === c2 - 1) return true
  }
  return false
}

function hasRepeating(s: string): boolean {
  for (let i = 0; i < s.length - 2; i++) {
    if (s[i] === s[i + 1] && s[i + 1] === s[i + 2]) return true
  }
  return false
}

export function validatePassword(password: string, email?: string): PasswordCheck {
  const errors: string[] = []

  if (!password) {
    return { valid: false, score: 0, label: '', color: 'bg-gray-200', errors: ['비밀번호를 입력해주세요.'] }
  }

  if (password.length < 8) {
    errors.push('최소 8자 이상이어야 합니다.')
  }

  const types = countTypes(password)
  if (password.length < 10 && types < 3) {
    errors.push('8자 이상은 영대문자·영소문자·숫자·특수문자 중 3종 이상 조합이 필요합니다.')
  } else if (password.length >= 10 && types < 2) {
    errors.push('10자 이상은 2종 이상 조합이 필요합니다.')
  }

  if (hasSequential(password)) {
    errors.push('연속된 문자/숫자(abc, 123 등)는 사용할 수 없습니다.')
  }

  if (hasRepeating(password)) {
    errors.push('같은 문자 3회 이상 반복은 사용할 수 없습니다.')
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

/** 로그인 시도 제한 (KISA: 5회 이하) */
const LOGIN_ATTEMPT_KEY = 'ps_login_attempts'
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15

interface LoginAttemptData {
  count: number
  lockedUntil: number | null
  lastAttempt: number
}

function getAttemptData(): LoginAttemptData {
  try {
    const raw = localStorage.getItem(LOGIN_ATTEMPT_KEY)
    if (!raw) return { count: 0, lockedUntil: null, lastAttempt: 0 }
    return JSON.parse(raw)
  } catch {
    return { count: 0, lockedUntil: null, lastAttempt: 0 }
  }
}

function saveAttemptData(data: LoginAttemptData) {
  localStorage.setItem(LOGIN_ATTEMPT_KEY, JSON.stringify(data))
}

// TODO: 향후 Supabase RPC 또는 Redis로 서버사이드 잠금 마이그레이션 필요 (현재 localStorage 기반은 클라이언트에서 우회 가능)
export function checkLoginLock(): { locked: boolean; remainingMinutes: number } {
  const data = getAttemptData()
  if (data.lockedUntil && Date.now() < data.lockedUntil) {
    const remaining = Math.ceil((data.lockedUntil - Date.now()) / 60000)
    return { locked: true, remainingMinutes: remaining }
  }
  if (data.lockedUntil && Date.now() >= data.lockedUntil) {
    saveAttemptData({ count: 0, lockedUntil: null, lastAttempt: 0 })
  }
  return { locked: false, remainingMinutes: 0 }
}

export function recordLoginFailure(): { locked: boolean; attemptsLeft: number } {
  const data = getAttemptData()
  data.count++
  data.lastAttempt = Date.now()

  if (data.count >= MAX_ATTEMPTS) {
    data.lockedUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000
    saveAttemptData(data)
    return { locked: true, attemptsLeft: 0 }
  }

  saveAttemptData(data)
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - data.count }
}

export function resetLoginAttempts() {
  localStorage.removeItem(LOGIN_ATTEMPT_KEY)
}
