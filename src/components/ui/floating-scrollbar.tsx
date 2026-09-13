"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface FloatingScrollbarProps {
  children: ReactNode
  className?: string
  /** altura maxima do thumb (pill curta tipo macOS). default 96px */
  maxThumb?: number
  /** respiro fixo em cima e embaixo do trilho (px). default 16px */
  gutter?: number
}

interface Metrics {
  ratio: number
  progress: number
  visible: boolean
  trackHeight: number
}

/**
 * Scroll container com thumb overlay de altura LIMITADA:
 * proporcional ao viewport, mas com teto (maxThumb) â€” nunca vira "linha" de ponta a ponta.
 * Esconde a scrollbar nativa; pill flutuante a direita com respiro fixo (gutter).
 * Roda do mouse/teclado continuam nativos.
 */
export function FloatingScrollbar({ children, className, maxThumb = 96, gutter = 16 }: FloatingScrollbarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const dragYRef = useRef(0)
  const [isDragging, setDragging] = useState(false)
  const [metrics, setMetrics] = useState<Metrics>({ ratio: 0, progress: 0, visible: false, trackHeight: 0 })

  const recompute = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const trackHeight = Math.max(el.clientHeight - gutter * 2, 0)
    const visible = el.scrollHeight > el.clientHeight + 2
    const ratio = visible ? Math.min(el.clientHeight / el.scrollHeight, 1) : 0
    const scrollable = el.scrollHeight - el.clientHeight
    const progress = scrollable > 0 ? el.scrollTop / scrollable : 0
    setMetrics({ ratio, progress, visible, trackHeight })
  }, [gutter])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    recompute()
    return () => ro.disconnect()
  }, [children, recompute])

  function onThumbPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    draggingRef.current = true
    setDragging(true)
    dragYRef.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onThumbPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const el = scrollRef.current
    if (!draggingRef.current || !el) return
    const delta = event.clientY - dragYRef.current
    dragYRef.current = event.clientY
    const scrollable = el.scrollHeight - el.clientHeight
    if (scrollable <= 0) return
    el.scrollTop = Math.min(Math.max(el.scrollTop + (delta / (metrics.trackHeight - thumbHeight)) * scrollable, 0), scrollable)
  }

  function onThumbPointerEnd() {
    draggingRef.current = false
    setDragging(false)
  }

  const thumbHeight = Math.round(Math.min(Math.max(metrics.ratio * metrics.trackHeight, 32), maxThumb))
  const travel = Math.max(metrics.trackHeight - thumbHeight, 0)
  const thumbTop = metrics.progress * travel

  return (
    <div className={cn("group/fscroll relative flex max-h-full flex-1 flex-col", className)}>
      <div
        ref={scrollRef}
        onScroll={recompute}
        className={cn("min-h-0 flex-1 overflow-y-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden")}
      >
        {children}
      </div>
      {metrics.visible && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute w-2.5"
          style={{ top: gutter, bottom: gutter, right: -8 }}
        >
          <div
            data-thumb
            onPointerDown={onThumbPointerDown}
            onPointerMove={onThumbPointerMove}
            onPointerUp={onThumbPointerEnd}
            onPointerCancel={onThumbPointerEnd}
            className={cn(
              "pointer-events-auto absolute right-0 w-2 cursor-default rounded-full bg-muted-foreground/30 opacity-0 transition-opacity duration-150 group-hover/fscroll:opacity-100",
              isDragging && "bg-muted-foreground/60",
            )}
            style={{ top: thumbTop, height: thumbHeight }}
          />
        </div>
      )}
    </div>
  )
}
