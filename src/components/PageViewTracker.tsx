'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function getSessionId(): string {
  const key = 'pv_session_id'
  let sid = sessionStorage.getItem(key)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(key, sid)
  }
  return sid
}

export function PageViewTracker() {
  const pathname = usePathname()
  const lastLog = useRef<{ path: string; time: number }>({ path: '', time: 0 })

  useEffect(() => {
    if (!pathname) return
    // Skip admin pages
    if (pathname.startsWith('/admin')) return

    // 봇/크롤러 필터 — 방문자 집계에서 제외 (2026-04-14 추가)
    const ua = navigator.userAgent || ''
    if (/bot|crawler|spider|preview|headless|phantom|lighthouse|pagespeed|pingdom|gtmetrix|uptime/i.test(ua)) return

    const now = Date.now()
    // Debounce: same path within 5 seconds
    if (lastLog.current.path === pathname && now - lastLog.current.time < 5000) return

    lastLog.current = { path: pathname, time: now }

    const supabase = createClient()
    supabase
      .from('page_views')
      .insert({
        path: pathname,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
      })
      .then(() => {})
  }, [pathname])

  return null
}
