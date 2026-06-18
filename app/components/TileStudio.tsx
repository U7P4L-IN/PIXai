'use client'

import { useEffect, useRef } from 'react'
import { Icons } from '@/app/components/icons'
import { ART_STYLE_GROUPS } from '@/app/lib/artStyles'
import { TILESET_COLS, TILESET_PRESETS, TILESET_ROWS, TILESET_SLOTS, TILE_TEMPLATE_MASK, TileSetRole, TileSetSlot, TileSetSlotSpec } from '@/app/lib/tileset'

export function TileSlotCell({
  slot,
  spec,
  onRegenerate,
  busy,
  showActions,
}: {
  slot: TileSetSlot
  spec: TileSetSlotSpec
  onRegenerate: () => void
  busy: boolean
  showActions: boolean
}) {
  return (
    <div
      className="group relative checker overflow-hidden rounded-[var(--radius-md)] anim-fade"
      style={{
        border: '1px solid var(--border)',
        aspectRatio: '1 / 1',
      }}
      title={spec.hint}
    >
      {slot.imageUrl ? (
        <img
          src={slot.imageUrl}
          alt={spec.hint}
          draggable={false}
          className="block h-full w-full"
          style={{ objectFit: 'contain' }}
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center text-[10px] font-mono"
          style={{
            color: 'var(--text-muted)',
            background:
              'repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,0.025) 6px 12px)',
          }}
        >
          {spec.label}
        </div>
      )}

      {slot.generating && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)' }}
        >
          <Icons.Spinner size={18} className="text-[color:var(--accent)]" />
        </div>
      )}

      <div
        className="pointer-events-none absolute left-1 top-1 rounded px-1 py-px font-mono text-[9px]"
        style={{
          background: 'rgba(0,0,0,0.55)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {spec.label}
      </div>

      {showActions && slot.imageUrl && !slot.generating && (
        <button
          onClick={onRegenerate}
          disabled={busy}
          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          style={{
            background: 'rgba(0,0,0,0.6)',
            color: 'var(--accent)',
            backdropFilter: 'blur(4px)',
          }}
          title={`Replace this tile (separate call — may not match the rest). For best consistency, re-roll the whole sheet instead.`}
        >
          <Icons.Sparkle size={11} />
        </button>
      )}
    </div>
  )
}

/**
 * Platform preview — define only a binary platform shape, then resolve each
 * occupied cell to a tile role from its neighbors. This mirrors how a simple
 * autotile importer works and avoids hand-placing role names in invalid spots.
 *
 * Mask legend: # = platform material, . = empty cutout / background.
 */

export function PlatformPreview({ tileSet }: { tileSet: TileSetSlot[] }) {
  const byRole = (role: TileSetRole) =>
    tileSet.find((s) => s.role === role)?.imageUrl ?? null
  // Mirror the AI input template (TILE_TEMPLATE_MASK) so the preview shows
  // the exact same silhouette the model restyled. Any role visible here
  // came from a real cell in the generated map.
  const previewMask = TILE_TEMPLATE_MASK
  const rows = previewMask.length
  const cols = previewMask[0]?.length ?? 0
  const isSolid = (x: number, y: number): boolean =>
    y >= 0 &&
    y < rows &&
    x >= 0 &&
    x < cols &&
    previewMask[y][x] === '#'

  const roleForCell = (x: number, y: number): TileSetRole | null => {
    if (!isSolid(x, y)) return null

    const top = !isSolid(x, y - 1)
    const bottom = !isSolid(x, y + 1)
    const left = !isSolid(x - 1, y)
    const right = !isSolid(x + 1, y)

    if (top && left) return 'tl_outer'
    if (top && right) return 'tr_outer'
    if (bottom && left) return 'bl_outer'
    if (bottom && right) return 'br_outer'
    if (top) return 'top'
    if (bottom) return 'bottom'
    if (left) return 'left'
    if (right) return 'right'

    // Concave corners: a diagonal empty cell with solid cardinal neighbors.
    if (!isSolid(x - 1, y - 1)) return 'tl_inner'
    if (!isSolid(x + 1, y - 1)) return 'tr_inner'
    if (!isSolid(x - 1, y + 1)) return 'bl_inner'
    if (!isSolid(x + 1, y + 1)) return 'br_inner'

    return 'body'
  }

  // Composite the platform into ONE canvas at an integer cell size instead
  // of a CSS grid of scaled <img> elements. A `1fr` grid rounds each track
  // and image to slightly different device pixels under fractional widths,
  // leaking the sky gradient through as hairline seams between tiles. Drawing
  // every cell at an exact integer pixel rect makes adjacent tiles share a
  // pixel boundary, so there is no gap to leak — the canvas as a whole is
  // then scaled uniformly by CSS.
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  // 96px/cell keeps downscaled detail crisp without an oversized canvas.
  const CELL_PX = 96
  const sheetW = cols * CELL_PX
  const sheetH = rows * CELL_PX

  // Stable signature of the rendered roles so the effect only re-runs when a
  // visible tile image actually changes.
  const renderKey = previewMask
    .flatMap((row, y) =>
      Array.from(row).map((_, x) => {
        const role = roleForCell(x, y)
        return `${role ?? '-'}:${(role && byRole(role)) ? byRole(role)!.length : 0}`
      })
    )
    .join('|')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let cancelled = false

    // Resolve each role's image once, then draw all cells in one pass so the
    // composite never shows a half-populated frame.
    const roleSrcs = new Map<TileSetRole, string>()
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const role = roleForCell(x, y)
        if (!role) continue
        const src = byRole(role)
        if (src) roleSrcs.set(role, src)
      }
    }

    const entries = Array.from(roleSrcs.entries())
    Promise.all(
      entries.map(
        ([role, src]) =>
          new Promise<[TileSetRole, HTMLImageElement | null]>((resolve) => {
            const img = new Image()
            img.onload = () => resolve([role, img])
            img.onerror = () => resolve([role, null])
            img.src = src
          })
      )
    ).then((loaded) => {
      if (cancelled) return
      const imgByRole = new Map<TileSetRole, HTMLImageElement>()
      loaded.forEach(([role, img]) => {
        if (img) imgByRole.set(role, img)
      })

      ctx.clearRect(0, 0, sheetW, sheetH)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const role = roleForCell(x, y)
          if (!role) continue
          const img = imgByRole.get(role)
          if (!img) continue
          ctx.drawImage(img, x * CELL_PX, y * CELL_PX, CELL_PX, CELL_PX)
        }
      }
    })

    return () => {
      cancelled = true
    }
  }, [renderKey, cols, rows, sheetW, sheetH])

  return (
    <div
      className="flex w-full items-center justify-center overflow-hidden rounded-[var(--radius-lg)] p-3"
      style={{
        aspectRatio: `${cols} / ${rows}`,
        border: '1px solid var(--border)',
        // Soft sky-ish gradient so chroma-keyed tiles read clearly.
        background:
          'linear-gradient(180deg, rgba(140, 195, 235, 0.18), rgba(40, 70, 110, 0.28))',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.04) inset, 0 24px 48px -12px rgba(0,0,0,0.5)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={sheetW}
        height={sheetH}
        className="block h-auto w-full"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  )
}


export function TileStudio({
  tileSet,
  prompt,
  setPrompt,
  artStyle,
  setArtStyle,
  generating,
  progressMessage,
  sceneBrief,
  setSceneBrief,
  sceneBriefLoading,
  onGenerateAll,
  onStop,
  onRegenerate,
  onClearAll,
  onDownloadSheet,
  onDownloadZip,
  dock,
}: {
  tileSet: TileSetSlot[]
  prompt: string
  setPrompt: (v: string) => void
  artStyle: string
  setArtStyle: (v: string) => void
  generating: boolean
  progressMessage?: string | null
  sceneBrief: string
  setSceneBrief: (v: string) => void
  sceneBriefLoading: boolean
  onGenerateAll: () => void
  onStop: () => void
  onRegenerate: (role: TileSetRole) => void
  onClearAll: () => void
  onDownloadSheet: () => void
  onDownloadZip: () => void
  dock?: React.ReactNode
}) {
  const filledCount = tileSet.filter((s) => s.hasImage).length
  const total = tileSet.length
  const hasAny = filledCount > 0

  // Build a 4x4 layout array so empty cells render placeholders. Slots are
  // already in row-major order in TILESET_SLOTS, but a couple of grid
  // positions are empty (3 cells in row 3) — represent those explicitly.
  type GridCell = { spec?: TileSetSlotSpec; slot?: TileSetSlot; empty?: boolean }
  const grid: GridCell[][] = []
  for (let r = 0; r < TILESET_ROWS; r++) {
    const row: GridCell[] = []
    for (let c = 0; c < TILESET_COLS; c++) {
      const spec = TILESET_SLOTS.find((s) => s.col === c && s.row === r)
      if (!spec) {
        row.push({ empty: true })
      } else {
        const slot = tileSet.find((s) => s.role === spec.role)
        row.push({ spec, slot })
      }
    }
    grid.push(row)
  }

  return (
    <>
      <section className="stage">
        <div className="stage-toolbar">
          <span style={{ color: hasAny ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {filledCount}/{total} tiles
            {progressMessage ? ` · ${progressMessage}` : ''}
          </span>
          {generating && (
            <button
              onClick={onStop}
              className="btn btn-danger"
              title="Stop the current generation"
            >
              <Icons.Stop size={14} />
              Stop
            </button>
          )}
        </div>

        <div className="stage-canvas">
          {hasAny ? (
            <div className="stage-plate">
              {/* Sprite sheet (4×4) + platform preview, side-by-side */}
              <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="flex flex-col gap-2">
                  <div
                    className="text-[11px] font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Sprite sheet (4×4)
                  </div>
                  <div
                    className="grid w-full"
                    style={{
                      gridTemplateColumns: `repeat(${TILESET_COLS}, 1fr)`,
                      gap: '6px',
                    }}
                  >
                    {grid.flat().map((cell, i) =>
                      cell.empty || !cell.spec || !cell.slot ? (
                        <div
                          key={`empty-${i}`}
                          className="rounded-[var(--radius-md)]"
                          style={{
                            aspectRatio: '1 / 1',
                            border: '1px dashed var(--border)',
                            background:
                              'repeating-linear-gradient(45deg, transparent 0 4px, rgba(255,255,255,0.015) 4px 8px)',
                          }}
                        />
                      ) : (
                        <TileSlotCell
                          key={cell.spec.role}
                          slot={cell.slot}
                          spec={cell.spec}
                          onRegenerate={() => onRegenerate(cell.spec!.role)}
                          busy={generating}
                          showActions
                        />
                      )
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div
                    className="flex items-center justify-between text-[11px] font-medium uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>Platform preview</span>
                    <span
                      className="font-mono normal-case tracking-normal"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      How tiles fit together
                    </span>
                  </div>
                  <PlatformPreview tileSet={tileSet} />
                  <div
                    className="text-[11px]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Hover a tile and click the spark to replace it (uses a separate
                    call, may drift). For best consistency, re-roll the whole sheet.
                    Body/edges are tile-locked along their loop axis; corners stand
                    alone.
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="stage-empty">
              <h1 className="font-display">Tileset</h1>
              <p>
                Describe a material and generate all 13 autotile pieces in one AI
                call — body, edges, and corners stay locked to a single palette.
              </p>
            </div>
          )}
        </div>
      </section>

      <aside className="inspector">
        <div className="inspector-header">
          <h2>Tileset</h2>
          <span>13-slice autotile from one prompt</span>
        </div>

        <div className="inspector-body">
          <div className="inspector-label">Scene direction</div>
          <div className="relative">
            <textarea
              value={sceneBrief}
              onChange={(e) => setSceneBrief(e.target.value)}
              disabled={generating || sceneBriefLoading}
              placeholder="Optional shared art direction. If you built a parallax scene, the brief is reused here so tiles match palette and lighting."
              rows={3}
              className="field w-full resize-none text-[13px] leading-relaxed"
            />
            {sceneBriefLoading && (
              <span
                className="absolute right-2 top-2 inline-flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--accent)' }}
              >
                <Icons.Spinner size={10} />
                Updating…
              </span>
            )}
          </div>

          {/* Starter chips — one-click prompt scaffolds. Stays visible so
              the user can switch material mid-iteration. The active chip
              highlights when its prompt is exactly equal to the current
              input, so picking a preset and editing one word still feels
              "started from this preset". */}
          <div className="inspector-label">Quick start</div>
          <div className="flex flex-wrap gap-1.5">
            {TILESET_PRESETS.map((preset) => {
              const active = prompt.trim() === preset.prompt
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPrompt(preset.prompt)}
                  disabled={generating}
                  className="chip"
                  aria-pressed={active}
                  title={preset.prompt}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <div className="inspector-label">Prompt</div>
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={generating}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                prompt.trim() &&
                !generating
              ) {
                e.preventDefault()
                onGenerateAll()
              }
            }}
            placeholder="Describe the material — or pick a quick start above"
            className="field w-full text-[14px]"
          />

          <div className="inspector-label">Art style</div>
          <select
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value)}
            disabled={generating}
            className="select-styled w-full"
            title="Art style for the tile-set"
          >
            {ART_STYLE_GROUPS.map((group) =>
              group.options.length === 1 && group.label === 'Match original' ? (
                <option key={group.options[0].value} value={group.options[0].value}>
                  {group.options[0].label}
                </option>
              ) : (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )
            )}
          </select>
        </div>

        <div className="inspector-selection">
          <button
            onClick={onDownloadSheet}
            disabled={!hasAny || generating}
            className="btn btn-secondary"
            title="Export clean + padded sprite-sheet PNGs with a JSON manifest"
          >
            <Icons.Download size={14} />
            Sheet + manifest
          </button>
          <button
            onClick={onDownloadZip}
            disabled={!hasAny || generating}
            className="btn btn-ghost"
            title="Export individual PNGs + clean sheet + padded sheet + manifest as a ZIP"
          >
            <Icons.Layers size={14} />
            ZIP
          </button>
          <button
            onClick={onClearAll}
            disabled={!hasAny || generating}
            className="btn btn-ghost"
            title="Clear all tiles and start over"
          >
            <Icons.Trash size={14} />
            Clear
          </button>
          {generating && (
            <button
              onClick={onStop}
              className="btn btn-danger"
              title="Stop the current generation"
            >
              <Icons.Stop size={14} />
              Stop
            </button>
          )}
        </div>

        <div className="inspector-dock">{dock}</div>
      </aside>
    </>
  )
}
