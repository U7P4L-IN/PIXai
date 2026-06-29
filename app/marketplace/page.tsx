'use client'

import { useCallback, useEffect, useState } from 'react'
import { CreditWallet } from '@/app/components/CreditWallet'
import { useCredits } from '@/app/components/CreditProvider'
import { Icons } from '@/app/components/icons'

type Currency = 'sol' | 'token'
type Listing = {
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

type MyModel = {
  id: string
  title: string
  prompt: string
  listed: boolean
  currency: Currency | null
  price: number | null
  sales: number
  hasThumb: boolean
}

const short = (a: string) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '')
const SYMBOL: Record<Currency, string> = { sol: 'SOL', token: 'PIXAI' }
const priceLabel = (c: Currency, p: number) => `${p} ${SYMBOL[c]}`
type Tab = 'browse' | 'mine' | 'purchases'

export default function MarketplacePage() {
  const { authed, address, signIn } = useCredits()
  const [tab, setTab] = useState<Tab>('browse')

  return (
    <div className="studio-light min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="studio-header">
        <a href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-80" title="Back to home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoo.png" alt="PIXAI" className="h-8 w-8 object-contain" />
          <span className="font-display text-[17px] font-semibold lowercase tracking-tight">pixai</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">market</span>
        </a>
        <div className="font-display text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          3D marketplace
        </div>
        <div className="flex items-center gap-1.5">
          <a href="/studio/3d" className="btn btn-ghost text-[13px]">3D Studio</a>
          <CreditWallet />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-8">
        {/* tabs */}
        <div className="mb-7 flex items-center gap-2">
          {([
            ['browse', 'Browse'],
            ['mine', 'My Models'],
            ['purchases', 'Purchases'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)} className="chip" aria-pressed={tab === t}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'browse' && <BrowseTab />}
        {tab === 'mine' &&
          (authed ? (
            <MyModelsTab />
          ) : (
            <SignInPrompt address={address} onSignIn={signIn} />
          ))}
        {tab === 'purchases' &&
          (authed ? (
            <PurchasesTab />
          ) : (
            <SignInPrompt address={address} onSignIn={signIn} />
          ))}
      </main>
    </div>
  )
}

function SignInPrompt({ address, onSignIn }: { address?: string; onSignIn: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <Icons.Key size={28} className="text-[var(--text-muted)]" />
      <p className="text-[15px] text-[var(--text-secondary)]">
        {address ? 'Sign in with your wallet to continue.' : 'Connect a wallet to continue.'}
      </p>
      {address && (
        <button onClick={onSignIn} className="btn btn-primary">
          Sign in
        </button>
      )}
    </div>
  )
}

function ThumbOrPlaceholder({ id, hasThumb, title }: { id: string; hasThumb: boolean; title: string }) {
  if (hasThumb) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={`/api/marketplace/thumb/${id}`}
        alt={title}
        className="aspect-square w-full object-cover transition-transform group-hover:scale-105"
      />
    )
  }
  return (
    <div className="flex aspect-square w-full items-center justify-center bg-[var(--surface)]">
      <Icons.Cube size={40} className="text-[var(--text-muted)]" />
    </div>
  )
}

function BrowseTab() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'new' | 'price'>('new')
  const [listings, setListings] = useState<Listing[] | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    const t = setTimeout(() => {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      params.set('sort', sort)
      fetch(`/api/marketplace?${params}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setListings(d.listings || []))
        .catch(() => {})
    }, 200)
    return () => {
      ctrl.abort()
      clearTimeout(t)
    }
  }, [q, sort])

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search models…"
          className="field max-w-xs"
        />
        <div className="flex gap-2">
          <button onClick={() => setSort('new')} className="chip" aria-pressed={sort === 'new'}>
            Newest
          </button>
          <button onClick={() => setSort('price')} className="chip" aria-pressed={sort === 'price'}>
            Price
          </button>
        </div>
      </div>

      {listings === null ? (
        <div className="flex justify-center py-24">
          <Icons.Spinner size={28} />
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <Icons.Store size={32} className="text-[var(--text-muted)]" />
          <p className="text-[15px] text-[var(--text-secondary)]">No models listed yet.</p>
          <a href="/studio/3d" className="btn btn-secondary">
            Generate one to sell
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <a
              key={l.id}
              href={`/marketplace/${l.id}`}
              className="group overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-all hover:border-[var(--border-strong)]"
            >
              <ThumbOrPlaceholder id={l.id} hasThumb={l.hasThumb} title={l.title} />
              <div className="space-y-1.5 p-4">
                <h3 className="truncate text-[14px] font-medium">{l.title}</h3>
                <p className="text-[12px] text-[var(--text-muted)]">by {short(l.ownerAddress)}</p>
                <p className="flex items-center gap-1 text-[13px] font-semibold">
                  <Icons.Coins size={13} /> {priceLabel(l.currency, l.price)}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </>
  )
}

function MyModelsTab() {
  const [models, setModels] = useState<MyModel[] | null>(null)
  const [tokenEnabled, setTokenEnabled] = useState(false)
  const load = useCallback(() => {
    fetch('/api/my/models')
      .then((r) => r.json())
      .then((d) => {
        setModels(d.models || [])
        setTokenEnabled(Boolean(d.tokenEnabled))
      })
      .catch(() => setModels([]))
  }, [])
  useEffect(load, [load])

  if (models === null) {
    return (
      <div className="flex justify-center py-24">
        <Icons.Spinner size={28} />
      </div>
    )
  }
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Icons.Cube size={32} className="text-[var(--text-muted)]" />
        <p className="text-[15px] text-[var(--text-secondary)]">You haven&apos;t generated any models yet.</p>
        <a href="/studio/3d" className="btn btn-primary">
          Open 3D Studio
        </a>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {models.map((m) => (
        <MyModelRow key={m.id} model={m} tokenEnabled={tokenEnabled} onChange={load} />
      ))}
    </div>
  )
}

function MyModelRow({
  model,
  tokenEnabled,
  onChange,
}: {
  model: MyModel
  tokenEnabled: boolean
  onChange: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(model.title)
  const [price, setPrice] = useState('')
  const [currency, setCurrency] = useState<Currency>('sol')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const publish = async () => {
    setErr(null)
    const priceNum = Number(price)
    if (!title.trim()) return setErr('Title required.')
    if (!Number.isFinite(priceNum) || priceNum <= 0) return setErr(`Enter a price in ${SYMBOL[currency]}.`)
    setBusy(true)
    try {
      const res = await fetch('/api/marketplace/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id, title: title.trim(), currency, price: priceNum }),
      })
      const d = await res.json()
      if (!res.ok) setErr(d.error || 'Failed to list.')
      else {
        setEditing(false)
        onChange()
      }
    } finally {
      setBusy(false)
    }
  }

  const unlist = async () => {
    setBusy(true)
    try {
      await fetch('/api/marketplace/unlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: model.id }),
      })
      onChange()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md">
        <ThumbOrPlaceholder id={model.id} hasThumb={model.hasThumb} title={model.title} />
      </div>
      <div className="min-w-0 flex-1">
        <a href={`/marketplace/${model.id}`} className="block truncate text-[14px] font-medium hover:underline">
          {model.title}
        </a>
        <p className="truncate text-[12px] text-[var(--text-muted)]">{model.prompt}</p>
        {model.listed && model.currency && model.price != null ? (
          <p className="mt-0.5 flex items-center gap-1 text-[12px] font-semibold text-[var(--text-secondary)]">
            <Icons.Tag size={12} /> Listed · {priceLabel(model.currency, model.price)} · {model.sales} sold
          </p>
        ) : (
          <p className="mt-0.5 text-[12px] text-[var(--text-muted)]">Not listed</p>
        )}
      </div>

      {!editing ? (
        <div className="flex shrink-0 gap-2">
          {model.listed ? (
            <button onClick={unlist} disabled={busy} className="btn btn-secondary text-[12px]">
              Unlist
            </button>
          ) : (
            <button onClick={() => setEditing(true)} className="btn btn-primary text-[12px]">
              List for sale
            </button>
          )}
        </div>
      ) : (
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex gap-1.5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="field h-8 text-[12px]"
              style={{ width: 128 }}
            />
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={SYMBOL[currency]}
              inputMode="decimal"
              className="field h-8 text-[12px]"
              style={{ width: 84 }}
            />
            {tokenEnabled ? (
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
                className="field h-8 text-[12px]"
                style={{ width: 90 }}
              >
                <option value="sol">SOL</option>
                <option value="token">PIXAI</option>
              </select>
            ) : (
              <span className="flex h-8 items-center px-1 text-[11px] text-[var(--text-muted)]">SOL</span>
            )}
            <button onClick={publish} disabled={busy} className="btn btn-primary text-[12px]">
              {busy ? '…' : 'Publish'}
            </button>
            <button onClick={() => setEditing(false)} className="btn btn-ghost text-[12px]">
              Cancel
            </button>
          </div>
          {err && <span className="text-[11px] text-[var(--danger)]">{err}</span>}
        </div>
      )}
    </div>
  )
}

function PurchasesTab() {
  const [items, setItems] = useState<Listing[] | null>(null)
  useEffect(() => {
    fetch('/api/my/purchases')
      .then((r) => r.json())
      .then((d) => setItems(d.purchases || []))
      .catch(() => setItems([]))
  }, [])

  if (items === null) {
    return (
      <div className="flex justify-center py-24">
        <Icons.Spinner size={28} />
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-center">
        <Icons.Download size={32} className="text-[var(--text-muted)]" />
        <p className="text-[15px] text-[var(--text-secondary)]">No purchases yet.</p>
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((l) => (
        <div key={l.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]">
          <a href={`/marketplace/${l.id}`} className="group block">
            <ThumbOrPlaceholder id={l.id} hasThumb={l.hasThumb} title={l.title} />
          </a>
          <div className="space-y-2 p-4">
            <h3 className="truncate text-[14px] font-medium">{l.title}</h3>
            <div className="flex flex-wrap gap-1.5">
              {l.formats.map((fmt) => (
                <a
                  key={fmt}
                  href={`/api/marketplace/download/${l.id}?fmt=${fmt}`}
                  className="btn btn-secondary px-2.5 py-1 text-[11px] uppercase"
                >
                  {fmt}
                </a>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
