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

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  // 서버 /api/chat/rooms 가 UUID v4 만 허용 → 순수 crypto.randomUUID() 사용
  // (이전 포맷 'guest_' + 8자는 서버 검증 실패 + 엔트로피 32비트 부족으로 폐기)
  let id = sessionStorage.getItem('presales_guest_id')
  if (!id || !UUID_V4_REGEX.test(id)) {
    id = crypto.randomUUID()
    sessionStorage.setItem('presales_guest_id', id)
  }
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
