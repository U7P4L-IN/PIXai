'use client'

import { Icons } from '@/app/components/icons'
import { ART_STYLE_GROUPS } from '@/app/lib/artStyles'
import { PROP_PRESETS, PropItem } from '@/app/lib/props'

export function PropItemCell({
  item,
  index,
  onRegenerate,
  onDelete,
  busy,
}: {
  item: PropItem
  index: number
  onRegenerate: () => void
  onDelete: () => void
  busy: boolean
}) {
  return (
    <div
      className="group relative checker overflow-hidden rounded-[var(--radius-md)] anim-fade"
      style={{ border: '1px solid var(--border)', aspectRatio: '1 / 1' }}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={`Prop ${index + 1}`}
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
        />
      )}

      {item.generating && (
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
          background: 'rgba(0,0,0,0.45)',
          color: 'var(--text-secondary)',
          backdropFilter: 'blur(4px)',
        }}
      >
        {index + 1}
      </div>

      {item.imageUrl && !item.generating && (
        <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onRegenerate}
            disabled={busy}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: 'var(--accent)',
              backdropFilter: 'blur(4px)',
            }}
            title="Re-roll this prop — a new decoration matched to the rest of the set"
          >
            <Icons.Sparkle size={11} />
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            className="inline-flex h-6 w-6 items-center justify-center rounded-full"
            style={{
              background: 'rgba(0,0,0,0.6)',
              color: 'var(--danger, #ff6b6b)',
              backdropFilter: 'blur(4px)',
            }}
            title="Delete this prop from the library"
          >
            <Icons.Trash size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// PropStudio — an OPEN-ENDED decoration library. Each "add more" press paints a
// fresh batch of decorations (the model invents them) and appends them to a
// growing gallery; existing props are never regenerated. Per-prop re-roll +
// delete let the user curate. Export packs the whole library into one atlas.
// ─────────────────────────────────────────────────────────────────────────────

export function PropStudio({
  items,
  batchSize,
  prompt,
  setPrompt,
  artStyle,
  setArtStyle,
  generating,
  progressMessage,
  sceneBrief,
  setSceneBrief,
  sceneBriefLoading,
  onAddMore,
  onStop,
  onRegenerate,
  onDelete,
  onClearAll,
  onDownloadSheet,
  onDownloadZip,
  dock,
}: {
  items: PropItem[]
  batchSize: number
  prompt: string
  setPrompt: (v: string) => void
  artStyle: string
  setArtStyle: (v: string) => void
  generating: boolean
  progressMessage?: string | null
  sceneBrief: string
  setSceneBrief: (v: string) => void
  sceneBriefLoading: boolean
  onAddMore: () => void
  onStop: () => void
  onRegenerate: (id: string) => void
  onDelete: (id: string) => void
  onClearAll: () => void
  onDownloadSheet: () => void
  onDownloadZip: () => void
  dock?: React.ReactNode
}) {
  const filledCount = items.filter((p) => p.imageUrl).length
  const hasAny = filledCount > 0

  return (
    <>
      <section className="stage">
        <div className="stage-toolbar">
          <span style={{ color: hasAny ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
            {filledCount} prop{filledCount === 1 ? '' : 's'}
            {progressMessage ? ` · ${progressMessage}` : ''}
          </span>
          {generating && (
            <button onClick={onStop} className="btn btn-danger" title="Stop the current generation">
              <Icons.Stop size={14} />
              Stop
            </button>
          )}
        </div>
        <div className="stage-canvas">
          {items.length === 0 ? (
            <div className="stage-empty">
              <h1 className="font-display">Decoration library</h1>
              <p>
                Pick a biome and press “Generate {batchSize} props” to start your
                decoration library. Keep pressing “Add more” to grow it — every prop
                is exported on transparency and style-matched to what you already have.
              </p>
            </div>
          ) : (
            <div
              className="grid w-full"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(110px, 1fr))`,
                gap: '6px',
              }}
            >
              {items.map((item, i) => (
                <PropItemCell
                  key={item.id}
                  item={item}
                  index={i}
                  onRegenerate={() => onRegenerate(item.id)}
                  onDelete={() => onDelete(item.id)}
                  busy={generating}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <aside className="inspector">
        <div className="inspector-header">
          <h2>Prop library</h2>
          <span>Batch of matching decorations</span>
        </div>
        <div className="inspector-body">
          <div className="inspector-label">Scene direction</div>
          <div className="flex flex-col gap-1.5">
            {sceneBriefLoading && (
              <span
                className="inline-flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Icons.Spinner size={10} />
                Updating…
              </span>
            )}
            <textarea
              value={sceneBrief}
              onChange={(e) => setSceneBrief(e.target.value)}
              disabled={generating || sceneBriefLoading}
              placeholder="Optional shared art direction. Reused from your parallax / tile work so the props match the same palette and lighting."
              rows={3}
              className="field w-full resize-none text-[13px] leading-relaxed"
            />
          </div>

          <div className="inspector-label">Quick start</div>
          <div className="flex flex-wrap gap-1.5">
            {PROP_PRESETS.map((preset) => {
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
              if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !generating) {
                e.preventDefault()
                onAddMore()
              }
            }}
            placeholder="Describe the biome / palette — or pick a quick start above"
            className="field w-full text-[14px]"
          />

          <div className="inspector-label">Art style</div>
          <select
            value={artStyle}
            onChange={(e) => setArtStyle(e.target.value)}
            disabled={generating}
            className="select-styled w-full text-[13px]"
            title="Art style for the props"
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
            title="Export the packed transparent atlas PNG with a JSON manifest"
          >
            <Icons.Download size={14} />
            Atlas + manifest
          </button>
          <button
            onClick={onDownloadZip}
            disabled={!hasAny || generating}
            className="btn btn-ghost"
            title="Export individual transparent PNGs + atlas + manifest as a ZIP"
          >
            <Icons.Layers size={14} />
            ZIP
          </button>
          <button
            onClick={onClearAll}
            disabled={!hasAny || generating}
            className="btn btn-ghost"
            title="Clear the whole library and start over"
          >
            <Icons.Trash size={14} />
            Clear
          </button>
        </div>

        <div className="inspector-dock">{dock}</div>
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SpriteStudio — generate a full character animation as ONE AI call so palette,
// outfit, proportions, and lighting stay locked across all 8 keyframes. Layout
// is a fixed 4×2 grid that we slice into individual frames after chroma-keying
// magenta → alpha. A live animation player shows the result playing back at
// the animation's native FPS so the designer can verify the cycle before export.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Animation player — composites the current sprite-sheet frames into an
 * actual playing animation at the user-controlled FPS. Skips empty frames
 * (lets the studio render partial sheets gracefully during generation).
 */
