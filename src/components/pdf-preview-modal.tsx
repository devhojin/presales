'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ChevronLeft, ChevronRight, Lock, ShoppingCart, Info } from 'lucide-react'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface PdfPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  productId: number
  previewPages: number
  productTitle: string
  onPurchaseClick: () => void
  purchaseLabel?: string
}

export function PdfPreviewModal({
  isOpen,
  onClose,
  productId,
  previewPages,
  productTitle,
  onPurchaseClick,
  purchaseLabel,
}: PdfPreviewModalProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [renderError, setRenderError] = useState('')
  const [resizeTick, setResizeTick] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const requestedPreviewPages = Math.min(Math.max(previewPages || 1, 1), 20)
  const previewUrl = `/api/pdf-preview?productId=${productId}&pages=${requestedPreviewPages}`
  const totalPreviewPages = pdfDoc
    ? Math.min(requestedPreviewPages, pdfDoc.numPages)
    : requestedPreviewPages
  // 70% 선명, 30% 블러
  const clearPages = Math.max(1, Math.ceil(totalPreviewPages * 0.7))
  const isBlurPage = currentPage > clearPages

  // Load PDF
  useEffect(() => {
    if (!isOpen || !productId) return

    setLoading(true)
    setError('')
    setRenderError('')
    setCurrentPage(1)
    setPdfDoc(null)
    let cancelled = false
    let loadedDoc: PDFDocumentProxy | null = null

    async function loadPdf() {
      try {
        const PromiseWithResolvers = Promise as typeof Promise & {
          withResolvers?: <T>() => {
            promise: Promise<T>
            resolve: (value: T | PromiseLike<T>) => void
            reject: (reason?: unknown) => void
          }
        }
        if (!PromiseWithResolvers.withResolvers) {
          PromiseWithResolvers.withResolvers = function withResolvers<T>() {
            let resolve!: (value: T | PromiseLike<T>) => void
            let reject!: (reason?: unknown) => void
            const promise = new Promise<T>((res, rej) => {
              resolve = res
              reject = rej
            })
            return { promise, resolve, reject }
          }
        }

        const pdfjs = await import('pdfjs-dist')
        // CSP: worker-src 'self' 범위 내 로컬 파일 사용 (unpkg 차단 회피 + CDN 의존 제거)
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

        const response = await fetch(previewUrl, {
          credentials: 'same-origin',
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`PDF fetch failed: ${response.status}`)
        }

        const pdfData = new Uint8Array(await response.arrayBuffer())
        const loadingTask = pdfjs.getDocument({
          data: pdfData,
          disableAutoFetch: true,
          disableRange: true,
          disableStream: true,
        })
        const doc = await loadingTask.promise
        loadedDoc = doc
        if (cancelled) {
          await doc.destroy()
          return
        }
        setPdfDoc(doc)
        setCurrentPage(1)
        setLoading(false)
      } catch (err: unknown) {
        console.error('PDF load error:', err)
        if (cancelled) return
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

    return () => {
      cancelled = true
      if (loadedDoc) void loadedDoc.destroy()
    }
  }, [isOpen, productId, previewUrl])

  useEffect(() => {
    if (pdfDoc && currentPage > totalPreviewPages) {
      setCurrentPage(totalPreviewPages)
    }
  }, [pdfDoc, currentPage, totalPreviewPages])

  // Render page
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return
    const doc = pdfDoc
    const canvas = canvasRef.current
    let cancelled = false

    async function renderPage() {
      try {
        setRenderError('')
        const safePage = Math.min(Math.max(currentPage, 1), doc.numPages)
        const page = await doc.getPage(safePage)
        if (cancelled) return

        const baseViewport = page.getViewport({ scale: 1 })
        const availableWidth = Math.max(
          280,
          Math.min(
            canvasWrapRef.current?.clientWidth || window.innerWidth - 32,
            window.innerWidth - 32,
          ),
        )
        const viewportHeight = window.visualViewport?.height || window.innerHeight
        const availableHeight = Math.max(280, viewportHeight - 210)
        const cssScale = Math.min(
          availableWidth / baseViewport.width,
          availableHeight / baseViewport.height,
          1.6,
        )
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = page.getViewport({ scale: cssScale * dpr })
        const ctx = canvas.getContext('2d')!

        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`

        await page.render({ canvas, canvasContext: ctx, viewport }).promise
      } catch (err) {
        console.error('Page render error:', err)
        if (!cancelled) setRenderError('PDF 페이지를 표시할 수 없습니다.')
      }
    }

    renderPage()

    return () => {
      cancelled = true
    }
  }, [pdfDoc, currentPage, resizeTick])

  useEffect(() => {
    if (!isOpen) return
    const handleResize = () => setResizeTick((tick) => tick + 1)
    window.addEventListener('resize', handleResize)
    window.visualViewport?.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.visualViewport?.removeEventListener('resize', handleResize)
    }
  }, [isOpen])

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
      <div className="relative bg-background rounded-2xl w-[calc(100%-1rem)] sm:w-auto max-w-4xl mx-auto my-2 sm:my-8 max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] overflow-hidden flex flex-col">
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
            <div className="flex items-center justify-center h-96 px-6">
              <div className="text-center">
                <p className="text-sm text-red-500">{error}</p>
                <p className="mt-3 text-xs text-gray-500">잠시 후 다시 시도해 주세요.</p>
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center p-3 sm:p-4 min-h-[min(62dvh,640px)] sm:min-h-[400px]">
              {/* Left Arrow */}
              <button
                onClick={() => currentPage > 1 && setCurrentPage((p) => p - 1)}
                disabled={currentPage <= 1}
                className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 w-11 h-11 sm:w-10 sm:h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-600 hover:bg-white disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Canvas */}
              <div ref={canvasWrapRef} className="relative flex w-full max-w-full items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full mx-auto shadow-lg rounded-lg bg-white"
                  style={{
                    filter: isBlurPage ? 'blur(8px)' : 'none',
                  }}
                />

                {renderError && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/95 px-6 text-center">
                    <div>
                      <p className="text-sm font-medium text-red-500">{renderError}</p>
                      <p className="mt-3 text-xs text-gray-500">잠시 후 다시 시도해 주세요.</p>
                    </div>
                  </div>
                )}

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
        {!loading && !error && pdfDoc && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 py-3 gap-2 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <p className="text-sm text-gray-500">
              페이지 {currentPage} / {totalPreviewPages}
            </p>
            {requestedPreviewPages > pdfDoc.numPages && (
            <span className="flex items-center gap-1 text-[11px] text-gray-400">
              <Info className="w-3 h-3" />
              실제 PDF는 {pdfDoc.numPages}페이지입니다
            </span>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-1.5">
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
        )}
      </div>
    </div>
  )
}
