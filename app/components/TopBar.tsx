'use client'

import { IconProps, Icons } from '@/app/components/icons'
import { Mode } from '@/app/lib/app'
import { MARKET_NAV } from '@/app/lib/credits'
import { CreditWallet } from '@/app/components/CreditWallet'

export function Logo() {
  return (
    <a href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80" title="Back to home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="PIXAI"
        width={28}
        height={28}
        className="h-7 w-7 object-contain"
        style={{ filter: 'drop-shadow(0 1px 3px rgba(0, 0, 0,0.18))' }}
      />
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[16px] font-bold tracking-tight">pixai</span>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent)]">studio</span>
      </div>
    </a>
  )
}


export function TopBar({
  hasImage,
  mode,
  setMode,
  onNewImage,
  onShowSettings,
  show3D = false,
}: {
  hasImage: boolean
  mode: Mode
  setMode: (m: Mode) => void
  onNewImage: () => void
  onShowSettings: () => void
  show3D?: boolean
}) {
  return (
    <header
      className="relative z-20 flex h-14 shrink-0 items-center justify-between border-b px-4 sm:px-6"
      style={{ borderColor: 'var(--border)' }}
    >
      <Logo />
      <ModeToggle mode={mode} setMode={setMode} show3D={show3D} />
      <div className="flex items-center gap-1.5">
        {hasImage && (
          <button onClick={onNewImage} className="btn btn-ghost">
            <Icons.Plus size={15} />
            New image
          </button>
        )}
        <CreditWallet />
        <button
          onClick={onShowSettings}
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <Icons.Settings size={17} />
        </button>
      </div>
    </header>
  )
}

/**
 * Compact segmented control that switches the workspace between Extender and
 * Parallax modes. Visually centered in the top bar so it reads as the primary
 * navigation rather than a settings option — switching tools is a first-class
 * action, not a hidden preference.
 */

export function ModeToggle({
  mode,
  setMode,
  show3D = false,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  /** Reveal the 3D pill (only once Meshy is configured on the server). */
  show3D?: boolean
}) {
  const tabs: { value: Mode; label: string; Icon: React.FC<IconProps>; hint: string }[] = [
    { value: 'sprite', label: 'Sprite', Icon: Icons.Play, hint: 'Character animations' },
    { value: 'tile', label: 'Tiles', Icon: Icons.Layers, hint: 'Seamless tile textures' },
    { value: 'parallax', label: 'Parallax', Icon: Icons.Mountain, hint: 'Sidescroller backgrounds' },
    { value: 'props', label: 'Props', Icon: Icons.Sprout, hint: 'Scatter decorations' },
  ]
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 hidden items-center gap-0.5 rounded-full p-1 sm:flex"
      style={{
        background: 'var(--bg-elev)',
        border: '1px solid var(--border)',
      }}
      role="tablist"
      aria-label="Workspace mode"
    >
      {tabs.map(({ value, label, Icon, hint }) => {
        const active = mode === value
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => setMode(value)}
            title={hint}
            className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors"
            style={{
              color: active ? '#04140a' : 'var(--text-secondary)',
              background: active ? 'var(--accent)' : 'transparent',
            }}
            onMouseEnter={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--text)'
            }}
            onMouseLeave={(e) => {
              if (!active) e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        )
      })}
      {/* 3D ships as a later update — revealed when Meshy is configured. */}
      {show3D && (
        <a
          href="/studio/3d"
          title="Generate 3D models"
          className="relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]"
        >
          <Icons.Cube size={13} />
          3D
        </a>
      )}
    </div>
  )
}


/**
 * Vertical mode rail — the new primary navigation for the redesigned studio.
 * Replaces the top-center ModeToggle. Same (mode/setMode/show3D) contract.
 */
export function ModeRail({
  mode,
  setMode,
  show3D = false,
  onNewImage,
}: {
  mode: Mode
  setMode: (m: Mode) => void
  show3D?: boolean
  onNewImage: () => void
}) {
  const tabs: { value: Mode; label: string; Icon: React.FC<IconProps> }[] = [
    { value: 'sprite', label: 'Sprite', Icon: Icons.Play },
    { value: 'tile', label: 'Tiles', Icon: Icons.Layers },
    { value: 'parallax', label: 'Parallax', Icon: Icons.Mountain },
    { value: 'props', label: 'Props', Icon: Icons.Sprout },
  ]
  return (
    <nav className="mode-rail" aria-label="Studio mode">
      {tabs.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-selected={mode === value}
          onClick={() => setMode(value)}
          className="mode-rail-btn"
        >
          <Icon size={18} />
          <span>{label}</span>
        </button>
      ))}
      {show3D && (
        <a href="/studio/3d" className="mode-rail-btn" title="Generate 3D models">
          <Icons.Cube size={18} />
          <span>3D</span>
        </a>
      )}
      {MARKET_NAV && (
        <a href="/marketplace" className="mode-rail-btn" title="3D model marketplace">
          <Icons.Store size={18} />
          <span>Market</span>
        </a>
      )}
      <div className="mode-rail-divider" />
      <button type="button" onClick={onNewImage} className="mode-rail-btn" title="New / reset">
        <Icons.Plus size={18} />
        <span>New</span>
      </button>
    </nav>
  )
}

/** Slim top header for the redesigned studio shell (light theme). */
export function StudioHeader({
  crumb,
  onShowSettings,
}: {
  crumb?: string
  onShowSettings: () => void
}) {
  return (
    <header className="studio-header">
      <a
        href="/"
        className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
        title="Back to home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logoo.png" alt="PIXAI" className="h-8 w-8 object-contain" />
        <span className="font-display text-[17px] font-semibold lowercase tracking-tight">pixai</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">studio</span>
      </a>
      {crumb && (
        <div className="font-display text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          {crumb}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <CreditWallet />
        <button
          onClick={onShowSettings}
          className="icon-btn"
          aria-label="Settings"
          title="Settings"
        >
          <Icons.Settings size={17} />
        </button>
      </div>
    </header>
  )
}


export function StatusPill({
  status,
  message,
}: {
  status: 'idle' | 'working' | 'error' | 'ok'
  message: string
}) {
  const color =
    status === 'error'
      ? 'var(--danger)'
      : status === 'ok'
        ? 'var(--success)'
        : status === 'working'
          ? 'var(--accent)'
          : 'var(--text-muted)'
  return (
    <div
      className="anim-slide-down flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px]"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--bg-elev)',
        color,
      }}
    >
      {status === 'working' ? (
        <Icons.Spinner size={12} />
      ) : (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: 'currentColor' }}
        />
      )}
      <span style={{ color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edge handles — spatial direction selectors that sit ON the image edges
// ─────────────────────────────────────────────────────────────────────────────

