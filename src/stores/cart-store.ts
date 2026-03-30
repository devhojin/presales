import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  productId: number
  title: string
  price: number
  originalPrice: number
  thumbnail: string
  format: string
}

interface CartState {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (productId: number) => void
  toggleItem: (item: CartItem) => void
  clearCart: () => void
  isInCart: (productId: number) => boolean
  getTotal: () => number
  getDiscountTotal: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const exists = get().items.find((i) => i.productId === item.productId)
        if (!exists) {
          set({ items: [...get().items, item] })
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) })
      },

      toggleItem: (item) => {
        const exists = get().items.find((i) => i.productId === item.productId)
        if (exists) {
          get().removeItem(item.productId)
        } else {
          get().addItem(item)
        }
      },

      clearCart: () => set({ items: [] }),

      isInCart: (productId) => {
        return get().items.some((i) => i.productId === productId)
      },

      getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0)
      },

      getDiscountTotal: () => {
        return get().items.reduce((sum, item) => sum + (item.originalPrice - item.price), 0)
      },
    }),
    {
      name: 'presales-cart',
    }
  )
)
