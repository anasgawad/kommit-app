// ============================================================
// Kommit — ResizeHandle Component
// Thin draggable divider rendered between resizable panels
// ============================================================

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
  direction?: 'horizontal' | 'vertical'
  isDragging?: boolean
}

export function ResizeHandle({ onMouseDown, direction = 'horizontal', isDragging = false }: ResizeHandleProps) {
  const isHorizontal = direction === 'horizontal'

  return (
    <div
      onMouseDown={onMouseDown}
      className={[
        'shrink-0 group relative flex items-center justify-center',
        'transition-colors duration-100',
        isHorizontal
          ? 'w-1 cursor-col-resize hover:bg-kommit-accent/40'
          : 'h-1 cursor-row-resize hover:bg-kommit-accent/40',
        isDragging ? 'bg-kommit-accent/60' : 'bg-transparent'
      ].join(' ')}
      style={isHorizontal ? { width: 4 } : { height: 4 }}
    >
      {/* Invisible wider hit-target so small movements don't miss the handle */}
      <div
        className={[
          'absolute',
          isHorizontal ? 'inset-y-0 -inset-x-1' : 'inset-x-0 -inset-y-1'
        ].join(' ')}
      />
    </div>
  )
}
