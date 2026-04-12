'use client'

import { useEffect, useRef } from 'react'

export function useScrollReveal<T extends HTMLElement>(threshold = 0.2) {
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) {
      el.setAttribute('data-visible', 'true')
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.setAttribute('data-visible', 'true')
          observer.unobserve(el)
        }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return ref
}

export function useCountUp(target: number, duration = 2000) {
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          function animate(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
            el!.textContent = Math.round(target * eased).toLocaleString()
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
          observer.unobserve(el)
        }
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return ref
}
