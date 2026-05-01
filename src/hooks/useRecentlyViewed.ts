'use client'

import { useCallback } from 'react'

const STORAGE_KEY = 'presales-recently-viewed'
const MAX_ITEMS = 8

interface RecentItem {
  id: number
  title: string
  thumbnail_url: string | null
  price: number
  viewedAt: number
}

export function useRecentlyViewed() {
  const addItem = useCallback((product: Omit<RecentItem, 'viewedAt'>) => {
    if (typeof window === 'undefined') return
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as RecentItem[]
    const filtered = stored.filter(item => item.id !== product.id)
    const updated = [{ ...product, viewedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }, [])

  const getItems = useCallback((): RecentItem[] => {
    if (typeof window === 'undefined') return []
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  }, [])

  return { addItem, getItems }
}
