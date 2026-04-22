import { create } from 'zustand'

interface ChatWidgetState {
  isOpen: boolean
  roomId: string | null
  guestId: string | null
  toggle: () => void
  open: () => void
  close: () => void
  setRoomId: (id: string | null) => void
  setGuestId: (id: string) => void
}

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const GUEST_ID_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30일

// localStorage 이동 사유: sessionStorage 는 탭/브라우저 종료 시 증발 → 게스트가 브라우저 재오픈 시 채팅방 이어가기 불가
// TTL 30일: stale 세션이 반영구 남는 것 방지 (회원 가입 유도 + 세션 재활용 리스크 완화)
function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  const storageKey = 'presales_guest_id'
  const tsKey = 'presales_guest_id_ts'

  // 레거시 sessionStorage 값 있으면 localStorage 로 자연 이전
  try {
    const legacy = sessionStorage.getItem(storageKey)
    if (legacy && UUID_V4_REGEX.test(legacy) && !localStorage.getItem(storageKey)) {
      localStorage.setItem(storageKey, legacy)
      localStorage.setItem(tsKey, String(Date.now()))
      sessionStorage.removeItem(storageKey)
    }
  } catch { /* storage 접근 차단 브라우저 무시 */ }

  const stored = localStorage.getItem(storageKey)
  const storedTs = Number(localStorage.getItem(tsKey) || 0)
  const expired = storedTs && (Date.now() - storedTs > GUEST_ID_TTL_MS)

  if (stored && UUID_V4_REGEX.test(stored) && !expired) {
    return stored
  }
  const id = crypto.randomUUID()
  localStorage.setItem(storageKey, id)
  localStorage.setItem(tsKey, String(Date.now()))
  return id
}

export const useChatWidgetStore = create<ChatWidgetState>((set) => ({
  isOpen: false,
  roomId: null,
  guestId: null,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setRoomId: (id) => set({ roomId: id }),
  setGuestId: (id) => set({ guestId: id }),
}))

export { getOrCreateGuestId }
