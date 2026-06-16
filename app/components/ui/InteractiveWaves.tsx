'use client'

import { CSSProperties, useCallback, useEffect, useRef } from 'react'

/* ------------------------------------------------------------------ *
 * InteractiveWaves — Perlin-noise line field that reacts to the cursor.
 * Adapted to TypeScript + the PIXAI theme (orange on near-black) and
 * wired to sit behind page content as a non-interactive background.
 * ------------------------------------------------------------------ */

/** Standard Perlin-noise generator used to drive the wave field. */
class Noise {
  private p = new Uint8Array(512)
  private grad3: number[][] = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  ]

  constructor(seed: number) {
    const s = seed > 0 && seed < 1 ? seed : 0.5
    this.init(s)
  }

  private init(seed: number) {
    const p = new Uint8Array(256)
    for (let i = 0; i < 256; i++) p[i] = i
    for (let i = 0; i < 256; i++) {
      const j = Math.floor(seed * (i + 1)) % 256
      const k = p[i]
      p[i] = p[j]
      p[j] = k
    }
    for (let i = 0; i < 512; i++) this.p[i] = p[i & 255]
  }

  private dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y
  }

  perlin2(x: number, y: number) {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    x -= Math.floor(x)
    y -= Math.floor(y)
    const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)
    const u = fade(x)
    const v = fade(y)
    const p = this.p
    const g = this.grad3
    const n00 = this.dot(g[p[X + p[Y]] % 12], x, y)
    const n01 = this.dot(g[p[X + p[Y + 1]] % 12], x, y - 1)
    const n10 = this.dot(g[p[X + 1 + p[Y]] % 12], x - 1, y)
    const n11 = this.dot(g[p[X + 1 + p[Y + 1]] % 12], x - 1, y - 1)
    const lerp = (a: number, b: number, t: number) => a + t * (b - a)
    return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v)
  }
}

const animationConfig = {
  GRID_X_GAP: 10,
  GRID_Y_GAP: 32,
  GRID_WIDTH_OFFSET: 200,
  GRID_HEIGHT_OFFSET: 30,
  WAVE_TIME_X_FACTOR: 0.0125,
  WAVE_NOISE_X_FACTOR: 0.002,
  WAVE_TIME_Y_FACTOR: 0.005,
  WAVE_NOISE_Y_FACTOR: 0.0015,
  WAVE_NOISE_MAGNITUDE: 12,
  WAVE_AMPLITUDE_X: 32,
  WAVE_AMPLITUDE_Y: 16,
  MOUSE_INFLUENCE_RADIUS: 175,
  MOUSE_FALLOFF_FACTOR: 0.001,
  MOUSE_FORCE_FACTOR: 0.00065,
  MOUSE_SMOOTHING_FACTOR: 0.1,
  MAX_MOUSE_VELOCITY: 100,
  TENSION_STRENGTH: 0.005,
  FRICTION: 0.925,
  CURSOR_DISPLACEMENT_STRENGTH: 2,
  MAX_CURSOR_DISPLACEMENT: 100,
}

interface Point {
  x: number
  y: number
  wave: { x: number; y: number }
  cursor: { x: number; y: number; vx: number; vy: number }
}

interface Mouse {
  x: number; y: number; lx: number; ly: number
  sx: number; sy: number; v: number; vs: number; a: number; set: boolean
}

interface WaveState {
  ctx: CanvasRenderingContext2D | null
  mouse: Mouse
  lines: Point[][]
  noise: Noise
  bounding: DOMRect | null
  animationFrameId: number | null
  lineColor: string
}

interface WavesProps {
  /** Stroke color of the wave lines. Defaults to the PIXAI orange, faint. */
  lineColor?: string
  /** Extra classes for the container (positioning, etc.). */
  className?: string
  style?: CSSProperties
}

const Waves = ({
  lineColor = 'rgba(95, 211, 95, 0.16)',
  className = '',
  style,
}: WavesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const state = useRef<WaveState>({
    ctx: null,
    mouse: { x: -10, y: 0, lx: 0, ly: 0, sx: 0, sy: 0, v: 0, vs: 0, a: 0, set: false },
    lines: [],
    noise: new Noise(0.5),
    bounding: null,
    animationFrameId: null,
    lineColor,
  })

  // keep colour in sync if the prop changes
  state.current.lineColor = lineColor

  const moved = useCallback((point: Point, withCursorForce = true) => {
    const x = point.x + point.wave.x + (withCursorForce ? point.cursor.x : 0)
    const y = point.y + point.wave.y + (withCursorForce ? point.cursor.y : 0)
    return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 }
  }, [])

  useEffect(() => {
    // re-seed only on the client to avoid hydration mismatch
    state.current.noise = new Noise(Math.random())

    const s = state.current
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    s.ctx = canvas.getContext('2d')

    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const setSize = () => {
      s.bounding = container.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = s.bounding.width * dpr
      canvas.height = s.bounding.height * dpr
      canvas.style.width = `${s.bounding.width}px`
      canvas.style.height = `${s.bounding.height}px`
      s.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const setLines = () => {
      if (!s.bounding) return
      const { width, height } = s.bounding
      s.lines = []
      const { GRID_X_GAP, GRID_Y_GAP, GRID_WIDTH_OFFSET, GRID_HEIGHT_OFFSET } = animationConfig
      const oWidth = width + GRID_WIDTH_OFFSET
      const oHeight = height + GRID_HEIGHT_OFFSET
      const totalLines = Math.ceil(oWidth / GRID_X_GAP)
      const totalPoints = Math.ceil(oHeight / GRID_Y_GAP)
      const xStart = (width - GRID_X_GAP * totalLines) / 2
      const yStart = (height - GRID_Y_GAP * totalPoints) / 2

      for (let i = 0; i <= totalLines; i++) {
        const points: Point[] = []
        for (let j = 0; j <= totalPoints; j++) {
          points.push({
            x: xStart + GRID_X_GAP * i,
            y: yStart + GRID_Y_GAP * j,
            wave: { x: 0, y: 0 },
            cursor: { x: 0, y: 0, vx: 0, vy: 0 },
          })
        }
        s.lines.push(points)
      }
    }

    const movePoints = (time: number) => {
      const { lines, mouse, noise } = s
      const c = animationConfig
      lines.forEach((points) => {
        points.forEach((p) => {
          const niX = (p.x + time * c.WAVE_TIME_X_FACTOR) * c.WAVE_NOISE_X_FACTOR
          const niY = (p.y + time * c.WAVE_TIME_Y_FACTOR) * c.WAVE_NOISE_Y_FACTOR
          const move = noise.perlin2(niX, niY) * c.WAVE_NOISE_MAGNITUDE
          p.wave.x = Math.cos(move) * c.WAVE_AMPLITUDE_X
          p.wave.y = Math.sin(move) * c.WAVE_AMPLITUDE_Y

          const dx = p.x - mouse.sx
          const dy = p.y - mouse.sy
          const d = Math.hypot(dx, dy)
          const influenceRadius = Math.max(c.MOUSE_INFLUENCE_RADIUS, mouse.vs)
          if (d < influenceRadius) {
            const falloff = 1 - d / influenceRadius
            const force = Math.cos(d * c.MOUSE_FALLOFF_FACTOR) * falloff
            const forceFactor = force * influenceRadius * mouse.vs * c.MOUSE_FORCE_FACTOR
            p.cursor.vx += Math.cos(mouse.a) * forceFactor
            p.cursor.vy += Math.sin(mouse.a) * forceFactor
          }

          p.cursor.vx += (0 - p.cursor.x) * c.TENSION_STRENGTH
          p.cursor.vy += (0 - p.cursor.y) * c.TENSION_STRENGTH
          p.cursor.vx *= c.FRICTION
          p.cursor.vy *= c.FRICTION
          p.cursor.x += p.cursor.vx * c.CURSOR_DISPLACEMENT_STRENGTH
          p.cursor.y += p.cursor.vy * c.CURSOR_DISPLACEMENT_STRENGTH
          p.cursor.x = Math.min(c.MAX_CURSOR_DISPLACEMENT, Math.max(-c.MAX_CURSOR_DISPLACEMENT, p.cursor.x))
          p.cursor.y = Math.min(c.MAX_CURSOR_DISPLACEMENT, Math.max(-c.MAX_CURSOR_DISPLACEMENT, p.cursor.y))
        })
      })
    }

    const drawLines = () => {
      const { ctx, bounding, lines } = s
      if (!ctx || !bounding) return
      ctx.clearRect(0, 0, bounding.width, bounding.height)
      ctx.beginPath()
      ctx.strokeStyle = s.lineColor
      ctx.lineWidth = 0.6
      lines.forEach((points) => {
        const p1 = moved(points[0], false)
        ctx.moveTo(p1.x, p1.y)
        for (let i = 0; i < points.length - 1; i++) {
          const cur = moved(points[i], true)
          const nxt = moved(points[i + 1], true)
          const xc = (cur.x + nxt.x) / 2
          const yc = (cur.y + nxt.y) / 2
          ctx.quadraticCurveTo(cur.x, cur.y, xc, yc)
        }
      })
      ctx.stroke()
    }

    const tick = (time: number) => {
      const { mouse } = s
      const c = animationConfig
      mouse.sx += (mouse.x - mouse.sx) * c.MOUSE_SMOOTHING_FACTOR
      mouse.sy += (mouse.y - mouse.sy) * c.MOUSE_SMOOTHING_FACTOR
      const dx = mouse.sx - mouse.lx
      const dy = mouse.sy - mouse.ly
      const d = Math.hypot(dx, dy)
      mouse.v = d
      mouse.vs += (d - mouse.vs) * c.MOUSE_SMOOTHING_FACTOR
      mouse.vs = Math.min(c.MAX_MOUSE_VELOCITY, mouse.vs)
      mouse.a = Math.atan2(dy, dx)
      mouse.lx = mouse.sx
      mouse.ly = mouse.sy
      container.style.setProperty('--x', `${mouse.sx}px`)
      container.style.setProperty('--y', `${mouse.sy}px`)
      movePoints(time)
      drawLines()
      s.animationFrameId = requestAnimationFrame(tick)
    }

    const updateMousePosition = (x: number, y: number) => {
      if (!s.bounding) return
      const { mouse } = s
      mouse.x = x - s.bounding.left
      mouse.y = y - s.bounding.top
      if (!mouse.set) {
        mouse.sx = mouse.x
        mouse.sy = mouse.y
        mouse.lx = mouse.x
        mouse.ly = mouse.y
        mouse.set = true
      }
    }

    const onResize = () => { setSize(); setLines() }
    const onMouseMove = (e: MouseEvent) => updateMousePosition(e.pageX, e.pageY)
    const onTouchMove = (e: TouchEvent) => updateMousePosition(e.touches[0].clientX, e.touches[0].clientY)

    setSize()
    setLines()

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('touchmove', onTouchMove, { passive: true })

    if (reduceMotion) {
      movePoints(0)
      drawLines()
    } else {
      s.animationFrameId = requestAnimationFrame(tick)
    }

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('touchmove', onTouchMove)
      if (s.animationFrameId) cancelAnimationFrame(s.animationFrameId)
    }
  }, [moved])

  return (
    <div
      ref={containerRef}
      className={`waves-bg ${className}`}
      style={style}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  )
}

export default Waves
