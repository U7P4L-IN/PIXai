'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppKit } from '@reown/appkit/react'
import { CreditWallet } from '@/app/components/CreditWallet'
import { useCredits } from '@/app/components/CreditProvider'
import { Icons } from '@/app/components/icons'

type Currency = 'sol' | 'token'
type Detail = {
  listing: {
    id: string
    title: string
    description?: string
    currency: Currency
    price: number
    ownerAddress: string
    formats: string[]
    hasThumb: boolean
    sales: number
  }
  seller: string
  feeBps: number
  treasury: string | null
  mint: string | null
  owned: boolean
  purchased: boolean
  canDownload: boolean
}

const short = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
const SYMBOL: Record<Currency, string> = { sol: 'SOL', token: 'PIXAI' }
const priceLabel = (c: Currency, p: number) => `${p} ${SYMBOL[c]}`

export default function ListingDetail({ params }: { params: { id: string } }) {
  const { id } = params
  const { open: openWallet } = useAppKit()
  const { address, isConnected, authed, signIn, buyAsset } = useCredits()

  const [data, setData] = useState<Detail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [buying, setBuying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mvRef = useRef<HTMLElement | null>(null)

  const load = useCallback(() => {
    fetch(`/api/marketplace/${id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setData(d))
      .catch(() => setNotFound(true))
  }, [id])
  useEffect(load, [load])

  // Load the <model-viewer> web component (only needed once we can preview).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (customElements.get('model-viewer')) return
    const s = document.createElement('script')
    s.type = 'module'
    s.src = 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'
    document.head.appendChild(s)
  }, [])

  const buy = async () => {
    if (!data) return
    setError(null)
    if (!isConnected || !address) {
      openWallet()
      return
    }
    if (!authed) {
      await signIn()
      return
    }
    setBuying(true)
    try {
      const txSignature = await buyAsset({
        currency: data.listing.currency,
        seller: data.seller,
        price: data.listing.price,
        feeBps: data.feeBps,
        treasury: data.treasury || undefined,
      })
      const res = await fetch('/api/marketplace/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: id, txSignature }),
      })
      const d = await res.json()
      if (!res.ok) {
        setError(d.error || 'Purchase could not be verified.')
        return
      }
      load() // flips canDownload → reveals viewer + downloads
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment was cancelled.')
    } finally {
      setBuying(false)
    }
  }

  if (notFound) {
    return (
      <div
        className="studio-light flex min-h-screen flex-col items-center justify-center gap-4 text-center"
        style={{ background: 'var(--bg)', color: 'var(--text)' }}
      >
        <Icons.Store size={32} className="text-[var(--text-muted)]" />
        <p className="text-[15px] text-[var(--text-secondary)]">This listing doesn&apos;t exist.</p>
        <a href="/marketplace" className="btn btn-primary">
          ← Back to marketplace
        </a>
      </div>
    )
  }

  const l = data?.listing

  return (
    <div className="studio-light min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="studio-header">
        <a href="/marketplace" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoo.png" alt="PIXAI" className="h-8 w-8 object-contain" />
          <span className="font-display text-[17px] font-semibold lowercase tracking-tight">pixai</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">market</span>
        </a>
        <div className="flex items-center gap-1.5">
          <a href="/marketplace" className="btn btn-ghost text-[13px]">← Marketplace</a>
          <CreditWallet />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
        {/* preview */}
        <div
          className="checker relative aspect-square overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)]"
        >
          {!data ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.Spinner size={28} />
            </div>
          ) : data.canDownload ? (
            <model-viewer
              ref={mvRef}
              src={`/api/marketplace/download/${id}?fmt=glb&inline=1`}
              alt={l?.title}
              camera-controls
              auto-rotate
              environment-image="neutral"
              shadow-intensity="1"
              exposure="1.1"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: 'transparent' }}
            />
          ) : l?.hasThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/marketplace/thumb/${id}`}
              alt={l.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icons.Cube size={48} className="text-[var(--text-muted)]" />
            </div>
          )}
          {data && !data.canDownload && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] text-white backdrop-blur">
              Buy to unlock the interactive 3D model + downloads
            </div>
          )}
        </div>

        {/* inspector */}
        <aside className="flex flex-col gap-5">
          {!data ? (
            <div className="py-12 text-center">
              <Icons.Spinner size={24} />
            </div>
          ) : (
            <>
              <div>
                <h1 className="font-display text-[24px] font-semibold leading-tight tracking-tight">{l!.title}</h1>
                <p className="mt-1 text-[12px] text-[var(--text-muted)]">
                  by {short(l!.ownerAddress)} · {l!.sales} sold
                </p>
              </div>

              {l!.description && (
                <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{l!.description}</p>
              )}

              <div className="flex flex-wrap gap-1.5">
                {l!.formats.map((fmt) => (
                  <span
                    key={fmt}
                    className="rounded-md border border-[var(--border)] px-2 py-0.5 text-[11px] uppercase text-[var(--text-muted)]"
                  >
                    {fmt}
                  </span>
                ))}
              </div>

              <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] uppercase tracking-wide text-[var(--text-muted)]">Price</span>
                  <span className="flex items-center gap-1.5 text-[20px] font-semibold">
                    <Icons.Coins size={18} /> {priceLabel(l!.currency, l!.price)}
                  </span>
                </div>
                {data.feeBps > 0 && (
                  <p className="mt-1 text-right text-[11px] text-[var(--text-muted)]">
                    incl. {data.feeBps / 100}% platform fee
                  </p>
                )}

                <div className="mt-4">
                  {data.owned ? (
                    <p className="text-center text-[13px] text-[var(--text-secondary)]">
                      This is your model.
                    </p>
                  ) : data.purchased ? (
                    <p className="flex items-center justify-center gap-1.5 text-center text-[13px] font-medium text-[var(--text-secondary)]">
                      <Icons.Check size={15} /> Purchased
                    </p>
                  ) : (
                    <button onClick={buy} disabled={buying} className="btn btn-primary w-full">
                      {buying ? (
                        <>
                          <Icons.Spinner size={16} /> Confirming…
                        </>
                      ) : (
                        <>Buy · {priceLabel(l!.currency, l!.price)}</>
                      )}
                    </button>
                  )}
                </div>
                {error && <p className="mt-2 text-center text-[12px] text-[var(--danger)]">{error}</p>}
              </div>

              {data.canDownload && (
                <div>
                  <div className="inspector-label mb-2">Download</div>
                  <div className="flex gap-2">
                    {l!.formats.map((fmt) => (
                      <a
                        key={fmt}
                        href={`/api/marketplace/download/${id}?fmt=${fmt}`}
                        className="btn btn-secondary px-3 py-1.5 text-[12px] uppercase"
                      >
                        {fmt}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </aside>
      </main>
    </div>
  )
}
