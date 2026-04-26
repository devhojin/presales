import { useRef, useCallback, useState } from 'react'

/**
 * 모달 상단을 드래그하여 이동할 수 있는 훅
 * 사용법:
 *   const { position, handleMouseDown, modalStyle } = useDraggableModal()
 *   <div style={modalStyle}> // 모달 컨테이너에 적용
 *     <div onMouseDown={handleMouseDown}> // 드래그 핸들 (헤더)에 적용
 */
export function useDraggableModal() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const offset = useRef({ x: 0, y: 0 })

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 버튼, 입력, 링크 등은 드래그 무시
    const tag = (e.target as HTMLElement).tagName
    if (['BUTTON', 'INPUT', 'A', 'SELECT', 'TEXTAREA', 'SVG', 'PATH'].includes(tag)) return

    dragging.current = true
    offset.current = { x: e.clientX - position.x, y: e.clientY - position.y }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return
      setPosition({ x: ev.clientX - offset.current.x, y: ev.clientY - offset.current.y })
    }

    const handleMouseUp = () => {
      dragging.current = false
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [position.x, position.y])

  const modalStyle = {
    transform: `translate(${position.x}px, ${position.y}px)`,
  }

  const resetPosition = useCallback(() => setPosition({ x: 0, y: 0 }), [])

  return { position, handleMouseDown, modalStyle, resetPosition }
}
