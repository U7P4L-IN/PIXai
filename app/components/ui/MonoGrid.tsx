'use client'

import { CSSProperties, useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ *
 * MonoGrid — an interactive black & white dot-matrix background.
 * A field of faint white dots on transparent; the cursor acts as a
 * spotlight that brightens and enlarges nearby dots, and the whole
 * field carries a slow ambient twinkle so it breathes without input.
 * Non-interactive (pointer-events: none) so content stays clickable.
 * Replaces the old coloured Perlin-wave background.
 * ------------------------------------------------------------------ */

interface MonoGridProps {
  /** Dot spacing in CSS pixels. */
  gap?: number
  /** Spotlight radius in CSS pixels. */
  radius?: number
  className?: string
  style?: CSSProperties
}

export default function MonoGrid({
  gap = 34,
  radius = 200,
  className = '',
  style,
}: MonoGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouse = useRef({ x: -9999, y: -9999, tx: -9999, ty: -9999 })
  const raf = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const draw = (t: number) => {
      const m = mouse.current
      // ease the spotlight toward the real cursor position
      m.x += (m.tx - m.x) * 0.12
      m.y += (m.ty - m.y) * 0.12

      ctx.clearRect(0, 0, w, h)
      const r2 = radius * radius

      for (let x = gap; x < w; x += gap) {
        for (let y = gap; y < h; y += gap) {
          // ambient twinkle — a slow per-dot shimmer
          const tw = reduceMotion
            ? 0
            : 0.5 + 0.5 * Math.sin(t * 0.0009 + x * 0.05 + y * 0.04)

          let alpha = 0.05 + tw * 0.03
          let size = 1

          const dx = x - m.x
          const dy = y - m.y
          const d2 = dx * dx + dy * dy
          if (d2 < r2) {
            const f = 1 - d2 / r2 // 0..1, strongest at the cursor
            const e = f * f
            alpha += e * 0.5
            size += e * 1.8
          }

          ctx.beginPath()
          ctx.fillStyle = 'rgba(0,0,0,' + alpha.toFixed(3) + ')'
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      raf.current = requestAnimationFrame(draw)
    }

    const onMove = (e: MouseEvent) => {
      mouse.current.tx = e.clientX
      mouse.current.ty = e.clientY
    }
    const onLeave = () => {
      mouse.current.tx = -9999
      mouse.current.ty = -9999
    }
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.current.tx = e.touches[0].clientX
        mouse.current.ty = e.touches[0].clientY
      }
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchmove', onTouch, { passive: true })

    raf.current = requestAnimationFrame(draw)

    return () => {
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('touchmove', onTouch)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [gap, radius])

  return (
    <canvas
      ref={canvasRef}
      className={'mono-grid ' + className}
      style={style}
      aria-hidden="true"
    />
  )
}
