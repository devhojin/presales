'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCartStore } from '@/stores/cart-store'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Trash2, X } from 'lucide-react'
import Link from 'next/link'

export function CartDrawer() {
  const { items, removeItem, clearCart, getTotal, getDiscountTotal } = useCartStore()
  const [open, setOpen] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') setShowClearConfirm(false)
  }, [])
  useEffect(() => {
    if (showClearConfirm) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showClearConfirm, handleKeyDown])

  useEffect(() => {
    if (showClearConfirm && cancelButtonRef.current) {
      cancelButtonRef.current.focus()
    }
  }, [showClearConfirm])

  const formatPrice = (price: number) => price === 0 ? '무료' : new Intl.NumberFormat('ko-KR').format(price) + '원'

  return (
    <>
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger className="relative min-w-[44px] min-h-[44px] flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <ShoppingCart className="w-5 h-5" />
          {items.length > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center bg-red-500 text-white text-[10px] border-0 rounded-full">
              {items.length}
            </Badge>
          )}
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[420px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            장바구니
            <Badge variant="outline" className="text-xs">{items.length}개</Badge>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-30" />
            <p className="font-medium">장바구니가 비어있습니다</p>
            <p className="text-sm mt-1">마음에 드는 템플릿을 담아보세요</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3 rounded-lg border border-border">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-16 h-12 rounded object-cover bg-muted shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">{formatPrice(item.price)}</span>
                      {item.originalPrice > item.price && (
                        <span className="text-xs text-muted-foreground line-through">{formatPrice(item.originalPrice)}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{item.format}</p>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="self-start p-1 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상품 금액</span>
                  <span>{formatPrice(getTotal() + getDiscountTotal())}</span>
                </div>
                {getDiscountTotal() > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>할인</span>
                    <span>-{formatPrice(getDiscountTotal())}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                  <span>결제 금액</span>
                  <span className="text-primary">{formatPrice(getTotal())}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="h-11 px-4 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  비우기
                </button>
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  className="flex-1 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors flex items-center justify-center"
                >
                  주문하기 ({formatPrice(getTotal())})
                </Link>
              </div>

              <p className="text-[11px] text-muted-foreground text-center">
                디지털 콘텐츠 특성상 다운로드 후 환불이 제한될 수 있습니다
              </p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>

    {/* Clear Cart Confirm Modal */}
    {showClearConfirm && (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setShowClearConfirm(false)}
      >
        <div
          className="bg-background rounded-xl p-6 max-w-sm w-full mx-4 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-semibold mb-2">장바구니 비우기</h3>
          <p className="text-sm text-muted-foreground mb-6">장바구니를 비우시겠습니까?</p>
          <div className="flex gap-3">
            <button
              ref={cancelButtonRef}
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-muted transition-colors cursor-pointer"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                clearCart()
                setShowClearConfirm(false)
              }}
              className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors cursor-pointer"
            >
              비우기
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
