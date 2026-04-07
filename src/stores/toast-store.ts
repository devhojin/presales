import { create } from 'zustand'

export interface ToastItem {
  id: string
  message: string
  type?: 'success' | 'info' | 'error'
}

interface ToastState {
  toasts: ToastItem[]
  addToast: (message: string, type?: 'success' | 'info' | 'error') => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type = 'success') => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2)
    set({ toasts: [...get().toasts, { id, message, type }] })
    setTimeout(() => {
      get().removeToast(id)
    }, 4000)
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))
