/**
 * Marketplace model + purchase store (server-only).
 *
 * Every 3D model generated in the studio is persisted here, owned by the wallet
 * that generated it (provenance — only studio-generated models can be sold). The
 * owner can then list it for sale; other wallets buy it (paid peer-to-peer in
 * SOL, verified in marketplacePayments.ts) which records a purchase that unlocks
 * downloads.
 *
 * Asset files (GLB/FBX/OBJ + thumbnail) are MIRRORED locally under
 * .data/models/<id>/ at generation time, because Meshy's CDN URLs are not
 * guaranteed to live forever. The original remote URLs are kept as a fallback.
 *
 * Backend: file-backed JSON under .data/ (same convention as creditStore's file
 * path). Production runs a single instance with the file store, so this is safe;
 * a Postgres backend can be added later behind the same API if it scales out.
 */
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const DATA_DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DATA_DIR, 'models.json')
const ASSET_DIR = path.join(DATA_DIR, 'models')

export type AssetFmt = 'glb' | 'fbx' | 'obj'
/** Listing currency — native SOL or the $PIXAI SPL token. */
export type MarketCurrency = 'sol' | 'token'

export interface ModelRecord {
  id: string
  /** Wallet that generated (and owns) this model. */
  owner: string
  prompt: string
  artStyle?: string
  /** Meshy refine task id — provenance of the generation. */
  taskId?: string
  mock?: boolean
  /** Local mirrored asset filenames (under .data/models/<id>/), by format. */
  files: Partial<Record<AssetFmt, string>>
  /** Original remote URLs (fallback if the local mirror is missing). */
  remote: Partial<Record<AssetFmt, string>> & { thumb?: string }
  /** Local thumbnail filename (under .data/models/<id>/), if mirrored. */
  thumb?: string
  createdAt: number
  // ── listing state ──
  listed: boolean
  title?: string
  description?: string
  /** Currency the seller priced this listing in. */
  currency?: MarketCurrency
  /** Listing price, in whole SOL or whole $PIXAI tokens (per `currency`). */
  price?: number
  listedAt?: number
  sales: number
}

export interface PurchaseRecord {
  id: string
  modelId: string
  buyer: string
  seller: string
  currency: MarketCurrency
  price: number
  txSignature: string
  at: number
}

interface Store {
  models: Record<string, ModelRecord>
  purchases: PurchaseRecord[]
}

// Serialize reads/writes through one promise chain (read-modify-write safety).
let lock: Promise<unknown> = Promise.resolve()
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn)
  lock = run.catch(() => {})
  return run
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    const parsed = JSON.parse(raw) as Partial<Store>
    return { models: parsed.models ?? {}, purchases: parsed.purchases ?? [] }
  } catch {
    return { models: {}, purchases: [] }
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), 'utf8')
}

const id = () => crypto.randomBytes(8).toString('hex')
const norm = (a: string) => a.trim()

/** Download a remote asset into the model's local folder. Returns filename or null. */
async function mirror(url: string | undefined, dir: string, filename: string): Promise<string | null> {
  if (!url) return null
  try {
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0) return null
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(path.join(dir, filename), buf)
    return filename
  } catch {
    return null
  }
}

/** Absolute path to a stored asset file (for serving). */
export function assetPath(modelId: string, filename: string): string {
  return path.join(ASSET_DIR, modelId, filename)
}

/**
 * Persist a freshly generated model, owned by `owner`. Returns immediately with
 * the record saved (referencing the remote Meshy URLs); the asset files are
 * MIRRORED LOCALLY IN THE BACKGROUND so this never blocks the generation
 * response on a ~20MB download. Meshy URLs are long-lived and the download/thumb
 * routes fall back to them, so everything works before the mirror completes.
 */
export async function createModel(
  owner: string,
  input: {
    prompt: string
    artStyle?: string
    taskId?: string
    mock?: boolean
    modelUrl: string
    thumbnailUrl?: string
    formats: Partial<Record<AssetFmt, string>>
  }
): Promise<ModelRecord> {
  const modelId = id()
  const remote: ModelRecord['remote'] = {
    glb: input.formats.glb ?? input.modelUrl,
    fbx: input.formats.fbx,
    obj: input.formats.obj,
    thumb: input.thumbnailUrl,
  }

  const rec: ModelRecord = {
    id: modelId,
    owner: norm(owner),
    prompt: input.prompt,
    artStyle: input.artStyle,
    taskId: input.taskId,
    mock: input.mock,
    files: {},
    remote,
    thumb: undefined,
    createdAt: Date.now(),
    listed: false,
    sales: 0,
  }

  await withLock(async () => {
    const store = await readStore()
    store.models[modelId] = rec
    await writeStore(store)
  })

  // Fire-and-forget: pull the assets into local storage without blocking.
  void mirrorAssets(modelId, remote)
  return rec
}

/** Download a model's assets to local storage, then patch the record. */
async function mirrorAssets(modelId: string, remote: ModelRecord['remote']): Promise<void> {
  const dir = path.join(ASSET_DIR, modelId)
  const [glb, fbx, obj, thumb] = await Promise.all([
    mirror(remote.glb, dir, 'model.glb'),
    mirror(remote.fbx, dir, 'model.fbx'),
    mirror(remote.obj, dir, 'model.obj'),
    mirror(remote.thumb, dir, 'thumb.png'),
  ])
  await withLock(async () => {
    const store = await readStore()
    const m = store.models[modelId]
    if (!m) return
    if (glb) m.files.glb = glb
    if (fbx) m.files.fbx = fbx
    if (obj) m.files.obj = obj
    if (thumb) m.thumb = thumb
    store.models[modelId] = m
    await writeStore(store)
  }).catch(() => {})
}

/** Full record (server-internal use only — may contain remote URLs/paths). */
export async function getModel(modelId: string): Promise<ModelRecord | null> {
  const store = await readStore()
  return store.models[modelId] ?? null
}

/** Which asset formats are available for a model (local OR remote). */
function availableFormats(m: ModelRecord): AssetFmt[] {
  const fmts: AssetFmt[] = ['glb', 'fbx', 'obj']
  return fmts.filter((f) => m.files[f] || m.remote[f])
}

/** Public, leak-safe projection of a listing (no file paths / remote URLs). */
export interface PublicListing {
  id: string
  title: string
  description?: string
  currency: MarketCurrency
  price: number
  ownerAddress: string
  artStyle?: string
  formats: AssetFmt[]
  hasThumb: boolean
  sales: number
  listedAt?: number
  createdAt: number
}

export function toPublic(m: ModelRecord): PublicListing {
  return {
    id: m.id,
    title: m.title || m.prompt.slice(0, 60),
    description: m.description,
    currency: m.currency ?? 'sol',
    price: m.price ?? 0,
    ownerAddress: m.owner,
    artStyle: m.artStyle,
    formats: availableFormats(m),
    hasThumb: Boolean(m.thumb || m.remote.thumb),
    sales: m.sales,
    listedAt: m.listedAt,
    createdAt: m.createdAt,
  }
}

/** All public listings (listed=true), newest-first, with optional text filter. */
export async function listListings(opts: { q?: string; sort?: 'new' | 'price' } = {}): Promise<PublicListing[]> {
  const store = await readStore()
  let items = Object.values(store.models).filter((m) => m.listed && (m.price ?? 0) > 0)
  const q = opts.q?.trim().toLowerCase()
  if (q) {
    items = items.filter(
      (m) =>
        (m.title || '').toLowerCase().includes(q) ||
        m.prompt.toLowerCase().includes(q) ||
        (m.description || '').toLowerCase().includes(q)
    )
  }
  if (opts.sort === 'price') items.sort((a, b) => (a.price ?? 0) - (b.price ?? 0))
  else items.sort((a, b) => (b.listedAt ?? b.createdAt) - (a.listedAt ?? a.createdAt))
  return items.map(toPublic)
}

/** All models owned by a wallet (for the "My Models" management view). */
export async function ownerModels(owner: string): Promise<ModelRecord[]> {
  const store = await readStore()
  return Object.values(store.models)
    .filter((m) => m.owner === norm(owner))
    .sort((a, b) => b.createdAt - a.createdAt)
}

/** Put an owned model up for sale (or update its listing). Owner-gated. */
export async function listForSale(
  modelId: string,
  owner: string,
  input: { title: string; description?: string; currency: MarketCurrency; price: number }
): Promise<ModelRecord | { error: string }> {
  return withLock(async () => {
    const store = await readStore()
    const m = store.models[modelId]
    if (!m) return { error: 'NOT_FOUND' }
    if (m.owner !== norm(owner)) return { error: 'NOT_OWNER' }
    m.title = input.title.slice(0, 80)
    m.description = input.description?.slice(0, 600)
    m.currency = input.currency
    m.price = input.price
    m.listed = true
    m.listedAt = Date.now()
    store.models[modelId] = m
    await writeStore(store)
    return m
  })
}

/** Remove a listing from sale. Owner-gated. */
export async function unlist(modelId: string, owner: string): Promise<boolean> {
  return withLock(async () => {
    const store = await readStore()
    const m = store.models[modelId]
    if (!m || m.owner !== norm(owner)) return false
    m.listed = false
    store.models[modelId] = m
    await writeStore(store)
    return true
  })
}

/** Has this wallet already purchased this model? */
export async function hasPurchased(buyer: string, modelId: string): Promise<boolean> {
  const store = await readStore()
  return store.purchases.some((p) => p.modelId === modelId && p.buyer === norm(buyer))
}

/** Owner OR a confirmed buyer may download the asset files. */
export async function hasAccess(addr: string, modelId: string): Promise<boolean> {
  const store = await readStore()
  const m = store.models[modelId]
  if (!m) return false
  if (m.owner === norm(addr)) return true
  return store.purchases.some((p) => p.modelId === modelId && p.buyer === norm(addr))
}

/** Record a verified purchase (idempotent on txSignature). Bumps sale count. */
export async function recordPurchase(input: {
  modelId: string
  buyer: string
  seller: string
  currency: MarketCurrency
  price: number
  txSignature: string
}): Promise<PurchaseRecord> {
  return withLock(async () => {
    const store = await readStore()
    const existing = store.purchases.find((p) => p.txSignature === input.txSignature)
    if (existing) return existing
    const rec: PurchaseRecord = {
      id: id(),
      modelId: input.modelId,
      buyer: norm(input.buyer),
      seller: norm(input.seller),
      currency: input.currency,
      price: input.price,
      txSignature: input.txSignature,
      at: Date.now(),
    }
    store.purchases.push(rec)
    const m = store.models[input.modelId]
    if (m) {
      m.sales += 1
      store.models[input.modelId] = m
    }
    await writeStore(store)
    return rec
  })
}

/** Listings a wallet has purchased (for the "Purchases" view). */
export async function purchasesOf(buyer: string): Promise<PublicListing[]> {
  const store = await readStore()
  const ids = store.purchases
    .filter((p) => p.buyer === norm(buyer))
    .sort((a, b) => b.at - a.at)
    .map((p) => p.modelId)
  const seen = new Set<string>()
  const out: PublicListing[] = []
  for (const mid of ids) {
    if (seen.has(mid)) continue
    seen.add(mid)
    const m = store.models[mid]
    if (m) out.push(toPublic(m))
  }
  return out
}
