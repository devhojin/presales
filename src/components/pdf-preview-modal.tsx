'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Lock, ShoppingCart, Info } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface PdfPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  pdfUrl: string
  previewPages: number
  productTitle: string
  onPurchaseClick: () => void
  purchaseLabel?: string
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  pdfUrl,
  previewPages,
  productTitle,
  onPurchaseClick,
  purchaseLabel,
}: PdfPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 미리보기 전체 페이지 수 (최대 30)
  const totalPreviewPages = Math.min(Math.max(previewPages, 1), 30)
  // 70% 선명, 30% 블러
  const clearPages = Math.max(1, Math.ceil(totalPreviewPages * 0.7))
  const isBlurPage = currentPage > clearPages

  // Load PDF
  useEffect(() => {
    if (!isOpen || !pdfUrl) return

    setLoading(true)
    setError('')
    setCurrentPage(1)

    async function loadPdf() {
      try {
        const pdfjs = await import('pdfjs-dist')
        // CSP: worker-src 'self' 범위 내 로컬 파일 사용 (unpkg 차단 회피 + CDN 의존 제거)
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const loadingTask = pdfjs.getDocument({
          url: pdfUrl,
          withCredentials: false,
        })
        const doc = await loadingTask.promise
        setPdfDoc(doc)
        setLoading(false)
      } catch (err: unknown) {
        console.error('PDF load error:', err)
        const message = err instanceof Error ? err.message : String(err)
        if (message.includes('Missing PDF') || message.includes('Invalid PDF')) {
          setError('유효하지 않은 PDF 파일입니다.')
        } else if (message.includes('fetch') || message.includes('network') || message.includes('Failed')) {
          setError('PDF 파일을 불러올 수 없습니다. 파일 URL을 확인해주세요.')
        } else {
          setError('PDF를 불러올 수 없습니다.')
        }
        setLoading(false)
      }
    }

    loadPdf()
  }, [isOpen, pdfUrl])

  // Render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    const doc = pdfDoc
    const canvas = canvasRef.current

    async function renderPage() {
      try {
        const page = await doc.getPage(currentPage)
        const viewport = page.getViewport({ scale: 1.5 })
        const ctx = canvas.getContext('2d')!

        canvas.width = viewport.width
        canvas.height = viewport.height

        await page.render({ canvas, canvasContext: ctx, viewport }).promise
      } catch (err) {
        console.error('Page render error:', err)
      }
    }

    renderPage()
  }, [pdfDoc, currentPage])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage((p) => p - 1)
      if (e.key === 'ArrowRight' && currentPage < totalPreviewPages)
        setCurrentPage((p) => p + 1)
    },
    [isOpen, currentPage, totalPreviewPages, onClose]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl w-[calc(100%-1rem)] sm:w-auto max-w-4xl mx-auto my-4 sm:my-8 max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">📖</span>
            <h2 className="text-base font-semibold text-gray-900 shrink-0">미리보기</h2>
            <span className="text-xs text-gray-400 ml-1 truncate hidden sm:inline">{productTitle}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto bg-gray-100 relative">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">PDF 로딩 중...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          ) : (
            <div className="relative flex items-center justify-center p-4 min-h-[400px]">
              {/* Left Arrow */}
              <button
                onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                disabled={currentPage <= 1}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Canvas */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[70vh] mx-auto shadow-lg rounded-lg"
                  style={{
                    filter: isBlurPage ? 'blur(8px)' : 'none',
                  }}
                />

                {/* Blur Overlay */}
                {isBlurPage && (
                  <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center rounded-lg">
                    <div className="bg-white/95 rounded-2xl p-8 text-center shadow-xl max-w-sm mx-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-base font-semibold text-gray-900 mb-2">
                        나머지 페이지는
                        <br />
                        구매 후 확인 가능합니다
                      </p>
                      <p className="text-xs text-gray-500 mb-6">
                        미리보기는 일부만 제공됩니다
                      </p>
                      <button
                        onClick={onPurchaseClick}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:bg-primary/90 transition-colors cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        {purchaseLabel || '구매하기'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Arrow */}
              <button
                onClick={() =>
                  currentPage < totalPreviewPages && setCurrentPage((p) => p + 1)
                }
                disabled={currentPage >= totalPreviewPages}
                className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 gap-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-500">
              페이지 {currentPage} / {totalPreviewPages}
            </p>
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Info className="w-3 h-3" />
              미리보기 수량은 실제 페이지 수량과 다릅니다
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPreviewPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-colors cursor-pointer ${
                  currentPage === i + 1
                    ? 'bg-blue-500'
                    : i < clearPages
                      ? 'bg-gray-300 hover:bg-gray-400'
                      : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <p className="hidden sm:block text-xs text-gray-400">
            ← → 키로 넘기기 · ESC로 닫기
          </p>
        </div>
      </div>
    </div>
  )
}
