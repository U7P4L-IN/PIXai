'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { CreditWallet } from '@/app/components/CreditWallet'
import { useCredits } from '@/app/components/CreditProvider'
import { MODEL3D_USD, MARKET_NAV, estimate3DUsd } from '@/app/lib/credits'
import { Icons } from '@/app/components/icons'

interface Model3D {
  modelUrl: string
  thumbnailUrl?: string
  formats: { glb?: string; fbx?: string; obj?: string }
  mock: boolean
  /** id of the persisted model — present once it's saved for the marketplace. */
  modelId?: string
}

const EXAMPLES = [
  'a low-poly treasure chest, game asset, wooden with iron bands',
  'a cute cartoon mushroom house, stylized',
  'a sci-fi laser pistol, clean hard-surface',
  'a stylized health potion bottle with cork',
  'a low-poly oak tree, hand-painted style',
]

const PRICE_LABEL =
  MODEL3D_USD.MIN === MODEL3D_USD.MAX
    ? `$${MODEL3D_USD.MIN}`
    : `$${MODEL3D_USD.MIN}–$${MODEL3D_USD.MAX}`

/* Left mode rail for the 3D route — the 2D modes link back to /studio,
   3D is the active item. Same .mode-rail look as the main studio. */
function Rail3D() {
  const modes: { label: string; Icon: typeof Icons.Play }[] = [
    { label: 'Sprite', Icon: Icons.Play },
    { label: 'Tiles', Icon: Icons.Layers },
    { label: 'Parallax', Icon: Icons.Mountain },
    { label: 'Props', Icon: Icons.Sprout },
  ]
  return (
    <nav className="mode-rail" aria-label="Studio mode">
      {modes.map(({ label, Icon }) => (
        <a key={label} href="/studio" className="mode-rail-btn" title={`${label} (2D studio)`}>
          <Icon size={18} />
          <span>{label}</span>
        </a>
      ))}
      <a href="/studio/3d" className="mode-rail-btn" aria-selected="true">
        <Icons.Cube size={18} />
        <span>3D</span>
      </a>
      {MARKET_NAV && (
        <a href="/marketplace" className="mode-rail-btn" title="3D model marketplace">
          <Icons.Store size={18} />
          <span>Market</span>
        </a>
      )}
    </nav>
  )
}

/** Inline "publish to marketplace" form, shown after a model is generated. */
function PublishPanel({ modelId, defaultTitle }: { modelId: string; defaultTitle: string }) {
  const [title, setTitle] = useState(defaultTitle.slice(0, 80))
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<'sol' | 'token'>('sol')
  const [tokenEnabled, setTokenEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [listed, setListed] = useState(false)

  useEffect(() => {
    fetch('/api/marketplace')
      .then((r) => r.json())
      .then((d) => setTokenEnabled(Boolean(d.tokenEnabled)))
      .catch(() => {})
  }, [])

  const symbol = currency === 'token' ? 'PIXAI' : 'SOL'

  const publish = async () => {
    setErr(null)
    const priceNum = Number(price)
    if (!title.trim()) return setErr('Add a title.')
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setErr(`Enter a price in ${symbol}.`)
    setBusy(true)
    try {
      const res = await fetch('/api/marketplace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId, title: title.trim(), currency, price: priceNum }),
      })
      const d = await res.json()
      if (!res.ok) setErr(d.error || 'Could not list — sign in with your wallet first.')
      else setListed(true)
    } catch {
      setErr('Could not list.')
    } finally {
      setBusy(false)
    }
  }

  if (listed) {
    return (
      <p className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
        <Icons.Check size={14} /> Listed —{' '}
        <a href={`/marketplace/${modelId}`} className="underline">
          view in marketplace
        </a>
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Listing title"
        className="field h-9 text-[13px]"
      />
      <div className="flex gap-2">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder={`Price in ${symbol}`}
          inputMode="decimal"
          className="field h-9 text-[13px]"
          style={{ flex: '1 1 0', minWidth: 0 }}
        />
        {tokenEnabled && (
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value as 'sol' | 'token')}
            className="field h-9 text-[13px]"
            style={{ width: 92, flex: '0 0 92px' }}
          >
            <option value="sol">SOL</option>
            <option value="token">PIXAI</option>
          </select>
        )}
      </div>
      <button onClick={publish} disabled={busy} className="btn btn-primary h-9 w-full text-[13px]">
        {busy ? 'Listing…' : 'List for sale'}
      </button>
      {err && <p className="text-[11px] text-[var(--danger)]">{err}</p>}
    </div>
  )
}

export default function Model3DStudio() {
  const { open: openWallet } = useAppKit()
  const { isConnected, address } = useAppKitAccount()
  const { authed, pay } = useCredits()

  const [prompt, setPrompt] = useState('')
  const [artStyle, setArtStyle] = useState<'realistic' | 'sculpture'>('realistic')
  const [loading, setLoading] = useState(false)
  const [model, setModel] = useState<Model3D | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState<boolean | null>(null)
  const mvRef = useRef<HTMLElement | null>(null)
  const [mvStatus, setMvStatus] = useState<string | null>(null)
  const [review, setReview] = useState<{ review: string; score: number } | null>(null)
  const [reviewing, setReviewing] = useState(false)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    fetch('/api/generate-3d')
      .then((r) => r.json())
      .then((d) => setLive(Boolean(d.live)))
      .catch(() => setLive(false))
  }, [])

  // Load the <model-viewer> web component reliably (Next <Script type=module>
  // can fail to register the custom element).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (customElements.get('model-viewer')) return
    const s = document.createElement('script')
    s.type = 'module'
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'
    document.head.appendChild(s)
  }, [])

  // Surface what the model-viewer is actually doing (loading / loaded / error).
  useEffect(() => {
    if (!model) {
      setMvStatus(null)
      return
    }
    setMvStatus('Loading model…')
    const mv = mvRef.current
    if (!mv) return
    const onLoad = () => setMvStatus(null)
    const onError = () =>
      setMvStatus("Viewer couldn't load the model — download the GLB below.")
    mv.addEventListener('load', onLoad)
    mv.addEventListener('error', onError)
    return () => {
      mv.removeEventListener('load', onLoad)
      mv.removeEventListener('error', onError)
    }
  }, [model])

  const startTimer = () => {
    setElapsed(0)
    elapsedRef.current = setInterval(() => setElapsed((e) => e + 1), 1000)
  }
  const stopTimer = () => {
    if (elapsedRef.current) clearInterval(elapsedRef.current)
  }

  const generate = async () => {
    setError(null)
    if (!prompt.trim()) {
      setError('Describe the model you want.')
      return
    }
    if (!isConnected || !address) {
      setError('Connect a wallet to generate.')
      openWallet()
      return
    }
    setLoading(true)
    setModel(null)
    setReview(null)

    // pay() checks /api/price fresh: returns null when free, txSignature when paid.
    let txSignature: string | null = null
    try {
      txSignature = await pay(estimate3DUsd(prompt.trim()))
    } catch (e) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Payment was cancelled.')
      return
    }

    startTimer()
    try {
      const res = await fetch('/api/generate-3d', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), artStyle, txSignature }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Generation failed.')
        return
      }
      setModel(data)
      // Fire the AI art-director review (free flavour; never blocks the result).
      setReviewing(true)
      fetch('/api/model-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), thumbnailUrl: data.thumbnailUrl }),
      })
        .then((r) => r.json())
        .then((d) => setReview(d.review ? { review: d.review, score: d.score } : null))
        .catch(() => setReview(null))
        .finally(() => setReviewing(false))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
    } finally {
      setLoading(false)
      stopTimer()
    }
  }

  // Hidden until Meshy is configured (the post-launch 3D update).
  if (live === false) {
    return (
      <main
        className="studio-light flex h-screen flex-col items-center justify-center px-6 text-center"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logoo.png" alt="" className="mb-6 h-20 w-20 object-contain" />
        <h1 className="font-display text-3xl font-semibold tracking-tight">3D Studio — coming soon</h1>
        <p className="mt-3 max-w-md text-[15px] text-[var(--text-secondary)]">
          Low-poly, textured, rigged 3D models — text to GLB / FBX / OBJ. Shipping
          as an update shortly after launch.
        </p>
        <a href="/studio" className="btn btn-primary mt-8">← Back to studio</a>
      </main>
    )
  }

  const walletHint = isConnected
    ? authed
      ? ''
      : 'Sign in with your wallet to generate'
    : 'Connect a wallet to generate'

  return (
    <div className="studio-light studio-shell">
      {/* header */}
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
        <div className="font-display text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          3D model
        </div>
        <div className="flex items-center gap-1.5">
          <a href="/studio" className="btn btn-ghost text-[13px]">← 2D Studio</a>
          <CreditWallet />
        </div>
      </header>

      <Rail3D />

      {/* stage: model viewer */}
      <section className="stage">
        <div className="stage-toolbar">
          <span className="text-[var(--text-muted)]">
            {mvStatus
              ? mvStatus
              : model
                ? 'Drag to orbit · scroll to zoom'
                : 'Text → low-poly model · GLB / FBX / OBJ'}
          </span>
          {model?.mock && (
            <span className="chip" aria-pressed="false">sample model</span>
          )}
        </div>
        <div className="stage-canvas">
          <div
            className="stage-plate checker"
            style={{ position: 'relative', width: '100%', maxWidth: 920, aspectRatio: '1 / 1', overflow: 'hidden' }}
          >
            {loading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center">
                <Icons.Spinner size={32} />
                <p className="text-[14px] text-[var(--text-secondary)]">Sculpting geometry… {elapsed}s</p>
                <p className="text-[12px] text-[var(--text-muted)]">Text-to-3D usually takes 30–60s</p>
              </div>
            ) : model ? (
              <model-viewer
                ref={mvRef}
                src={`/api/model-proxy?url=${encodeURIComponent(model.modelUrl)}`}
                alt="Generated 3D model"
                camera-controls
                auto-rotate
                environment-image="neutral"
                shadow-intensity="1"
                exposure="1.1"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent', zIndex: 10 }}
              />
            ) : (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 px-6 text-center">
                <h1 className="stage-empty-title font-display text-[26px] tracking-tight text-[var(--text)]">
                  Describe a model
                </h1>
                <p className="text-[13px] text-[var(--text-muted)]">
                  Type what you need on the right, then generate. Drag to orbit, scroll to zoom once it loads.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* inspector */}
      <aside className="inspector">
        <div className="inspector-header">
          <h2>3D Studio</h2>
          <span>Text to a low-poly, textured model</span>
        </div>

        <div className="inspector-body">
          <div>
            <div className="inspector-label">Describe your model</div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="a low-poly treasure chest, wooden with iron bands…"
              className="field resize-none"
            />
          </div>

          <div>
            <div className="inspector-label">Art style</div>
            <div className="flex flex-wrap gap-2">
              {(['realistic'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setArtStyle(s)}
                  className="chip capitalize"
                  aria-pressed={artStyle === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="inspector-label">Examples</div>
            <div className="flex flex-col gap-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setPrompt(ex)}
                  className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-left text-[12px] text-[var(--text-secondary)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-[12px] text-[var(--danger)]">{error}</p>}
        </div>

        {(reviewing || review) && (
          <div className="inspector-selection">
            <div className="inspector-label mb-2 flex items-center gap-1.5">
              <Icons.Sparkle size={12} /> Art director review
            </div>
            {reviewing && !review ? (
              <p className="flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
                <Icons.Spinner size={13} /> Taking a look…
              </p>
            ) : review ? (
              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="text-[15px] font-semibold">{review.score}/10</span>
                  <span className="text-[12px]">
                    {'★'.repeat(Math.round(review.score / 2))}
                    <span className="text-[var(--text-muted)]">
                      {'★'.repeat(5 - Math.round(review.score / 2))}
                    </span>
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">{review.review}</p>
              </div>
            ) : null}
          </div>
        )}

        <div className="inspector-selection">
          <div className="inspector-label">Export</div>
          {model ? (
            <div className="flex gap-2">
              {(['glb', 'fbx', 'obj'] as const).map((fmt) => {
                const url = model.formats[fmt]
                return url ? (
                  <a
                    key={fmt}
                    href={url}
                    download
                    className="btn btn-secondary px-3 py-1.5 text-[12px] uppercase"
                  >
                    {fmt}
                  </a>
                ) : (
                  <span
                    key={fmt}
                    className="px-3 py-1.5 text-[12px] uppercase text-[var(--text-muted)] opacity-40"
                  >
                    {fmt}
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-muted)]">
              GLB / FBX / OBJ appear here after generation.
            </p>
          )}

          {MARKET_NAV && model?.modelId && (
            <div className="mt-4">
              <div className="inspector-label mb-2 flex items-center gap-1.5">
                <Icons.Tag size={12} /> Sell on the marketplace
              </div>
              <PublishPanel modelId={model.modelId} defaultTitle={prompt.trim()} />
            </div>
          )}
        </div>

        <div className="inspector-dock">
          <button onClick={generate} disabled={loading} className="btn btn-primary">
            {loading ? (
              <>
                <Icons.Spinner size={16} /> Generating… {elapsed}s
              </>
            ) : (
              <>Generate · {PRICE_LABEL}</>
            )}
          </button>
          {walletHint && <p className="generate-sub">{walletHint}</p>}
        </div>
      </aside>
    </div>
  )
}
