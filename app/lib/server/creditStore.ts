/**
 * Credit ledger. Two backends, picked at runtime:
 *   - DATABASE_URL set  → Postgres (creditStore.pg.ts) — production, multi-instance safe
 *   - otherwise         → file-backed .data/credits.json — localhost/dev only
 *
 * Public API (getAccount / grant / spend) is identical for both.
 */
import { promises as fs } from 'fs'
import path from 'path'
import { SIGNUP_BONUS } from '@/app/lib/credits'

const USE_PG = Boolean(process.env.DATABASE_URL)
let pgMod: typeof import('@/app/lib/server/creditStore.pg') | null = null
async function pg() {
  if (!pgMod) pgMod = await import('@/app/lib/server/creditStore.pg')
  return pgMod
}

export interface LedgerEntry {
  ts: number
  /** 'signup' | 'faucet' | 'purchase' | 'spend' */
  type: string
  /** signed change in credits (+grant / -spend) */
  delta: number
  balance: number
  note?: string
}

export interface Account {
  credits: number
  history: LedgerEntry[]
}

type Store = Record<string, Account>

const DATA_DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DATA_DIR, 'credits.json')

// Serialize all reads/writes through a single promise chain so concurrent
// requests can't clobber the file (read-modify-write race).
let lock: Promise<unknown> = Promise.resolve()
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn)
  lock = run.catch(() => {})
  return run
}

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(FILE, 'utf8')
    return JSON.parse(raw) as Store
  } catch {
    return {}
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true })
  await fs.writeFile(FILE, JSON.stringify(store, null, 2), 'utf8')
}

function normalize(address: string): string {
  return address.trim()
}

/** Get (or lazily create with a signup bonus) an account. */
function fileGetAccount(address: string): Promise<Account> {
  return withLock(async () => {
    const addr = normalize(address)
    const store = await readStore()
    if (!store[addr]) {
      store[addr] = {
        credits: SIGNUP_BONUS,
        history: [{ ts: Date.now(), type: 'signup', delta: SIGNUP_BONUS, balance: SIGNUP_BONUS }],
      }
      await writeStore(store)
    }
    return store[addr]
  })
}

/** Add credits (faucet / purchase). Returns the new balance. */
function fileGrant(address: string, amount: number, type: string, note?: string): Promise<number> {
  return withLock(async () => {
    const addr = normalize(address)
    const store = await readStore()
    const acc = store[addr] ?? { credits: 0, history: [] }
    acc.credits += amount
    acc.history.push({ ts: Date.now(), type, delta: amount, balance: acc.credits, note })
    store[addr] = acc
    await writeStore(store)
    return acc.credits
  })
}

export interface SpendResult {
  ok: boolean
  balance: number
}

/** Atomically spend credits. Fails (ok:false) if balance is insufficient. */
function fileSpend(address: string, amount: number, note?: string): Promise<SpendResult> {
  return withLock(async () => {
    const addr = normalize(address)
    const store = await readStore()
    const acc = store[addr] ?? {
      credits: SIGNUP_BONUS,
      history: [{ ts: Date.now(), type: 'signup', delta: SIGNUP_BONUS, balance: SIGNUP_BONUS }],
    }
    if (acc.credits < amount) {
      store[addr] = acc
      await writeStore(store)
      return { ok: false, balance: acc.credits }
    }
    acc.credits -= amount
    acc.history.push({ ts: Date.now(), type: 'spend', delta: -amount, balance: acc.credits, note })
    store[addr] = acc
    await writeStore(store)
    return { ok: true, balance: acc.credits }
  })
}

// --- Public API: delegate to Postgres in prod, file store in dev ----------

export async function getAccount(address: string): Promise<Account> {
  return USE_PG ? (await pg()).getAccount(address) : fileGetAccount(address)
}

export async function grant(
  address: string,
  amount: number,
  type: string,
  note?: string
): Promise<number> {
  return USE_PG ? (await pg()).grant(address, amount, type, note) : fileGrant(address, amount, type, note)
}

export async function spend(address: string, amount: number, note?: string): Promise<SpendResult> {
  return USE_PG ? (await pg()).spend(address, amount, note) : fileSpend(address, amount, note)
}
