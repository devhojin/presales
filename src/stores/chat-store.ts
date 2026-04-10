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

function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('presales_guest_id')
  if (!id) {
    id = 'guest_' + crypto.randomUUID().slice(0, 8)
    localStorage.setItem('presales_guest_id', id)
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
