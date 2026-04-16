'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { usePathname } from 'next/navigation'

const EXCLUDED_PATHS = ['/auth', '/admin', '/checkout']

export function ExitIntentPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  const dismiss = useCallback(() => {
    setIsOpen(false)
    sessionStorage.setItem('exitIntentShown', 'true')
  }, [])

  useEffect(() => {
    if (EXCLUDED_PATHS.some(p => pathname.startsWith(p))) return
    if (sessionStorage.getItem('exitIntentShown') === 'true') return

    const handleMouseOut = (e: MouseEvent) => {
      if (e.relatedTarget === null || e.clientY <= 0) {
        if (sessionStorage.getItem('exitIntentShown') !== 'true') {
          setIsOpen(true)
        }
      }
    }

    document.addEventListener('mouseout', handleMouseOut)
    return () => document.removeEventListener('mouseout', handleMouseOut)
  }, [pathname])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={dismiss} />

      {/* Modal */}
      <div className="relative max-w-md w-full mx-4 rounded-2xl bg-card shadow-2xl p-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center cursor-pointer"
          aria-label="닫기"
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">잠깐! 무료 제안서 샘플을 받아가세요</h2>
          <p className="text-sm text-muted-foreground mb-6">
            입찰 준비에 바로 활용할 수 있는 무료 템플릿을 확인하세요.
          </p>

          {/* CTA */}
          <Link
            href="/store?price=free"
            onClick={dismiss}
            className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer"
          >
            무료 템플릿 보기
          </Link>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            다음에 볼게요
          </button>
        </div>
      </div>
    </div>
  )
}
