// ============================================================
// Kommit — useResize Hook
// Provides drag-to-resize behaviour for panel splitters
// ============================================================

import { useCallback, useEffect, useRef, useState } from 'react'

type Direction = 'horizontal' | 'vertical'

interface UseResizeOptions {
  /** Initial size in pixels */
  initialSize: number
  /** Minimum allowed size in pixels */
  min?: number
  /** Maximum allowed size in pixels */
  max?: number
  /** Whether dragging moves along the x-axis (horizontal) or y-axis (vertical) */
  direction?: Direction
}

interface UseResizeReturn {
  size: number
  isDragging: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useResize({
  initialSize,
  min = 120,
  max = 1200,
  direction = 'horizontal'
}: UseResizeOptions): UseResizeReturn {
  const [size, setSize] = useState(initialSize)
  const [isDragging, setIsDragging] = useState(false)
  const startPos = useRef(0)
  const startSize = useRef(initialSize)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
    startSize.current = size
  }, [direction, size])

  useEffect(() => {
    if (!isDragging) return

    const onMouseMove = (e: MouseEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY
      const delta = current - startPos.current
      const next = Math.min(max, Math.max(min, startSize.current + delta))
      setSize(next)
    }

    const onMouseUp = () => setIsDragging(false)

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, direction, min, max])

  return { size, isDragging, handleMouseDown }
}
