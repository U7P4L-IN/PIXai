/**
 * PIXAI SDK — generate game assets from code.
 *
 * A headless client for a PIXAI instance (e.g. https://pixai.studio). It
 * wraps the raw HTTP API with:
 *   - Sign-In with Solana (SIWS) auth from a Keypair (no browser/wallet),
 *   - automatic payment ($PIXAI token-burn or native SOL, per the instance),
 *   - typed generation calls (3D models) + marketplace reads.
 *
 * It talks to the SAME public API the website uses — no server changes needed.
 *
 *   import { PixAI } from '@pixai/sdk'
 *   const pixai = new PixAI({ secretKey: process.env.SOLANA_SECRET_KEY! })
 *   const model = await pixai.generate3D({ prompt: 'low-poly treasure chest' })
 *   console.log(model.modelUrl)
 */
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js'
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createBurnCheckedInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { ed25519 } from '@noble/curves/ed25519'
import bs58 from 'bs58'

export interface PixAIOptions {
  /** Solana secret key — base58 string or 64-byte Uint8Array. Auths + pays. */
  secretKey: string | Uint8Array
  /** PIXAI base URL. Default https://pixai.studio */
  baseUrl?: string
  /** Solana RPC for sending payments. Default mainnet-beta public RPC. */
  rpcUrl?: string
  /** Override fetch (e.g. for older Node). Defaults to global fetch. */
  fetch?: typeof fetch
}

export interface PriceInfo {
  symbol: string
  payInSol: boolean
  mint: string | null
  treasury: string | null
  network: string
  live: boolean
  burnBps: number
  tokenUsd: number | null
}

export interface Model3DResult {
  modelUrl: string
  thumbnailUrl?: string
  formats: { glb?: string; fbx?: string; obj?: string }
  mock: boolean
  taskId?: string
  modelId?: string
  priceUsd?: number
  priceTokens?: number | null
  tokenUsd?: number
}

export interface Generate3DInput {
  prompt: string
  artStyle?: 'realistic' | 'sculpture'
  topology?: 'quad' | 'triangle'
  targetPolycount?: number
  /**
   * USD budget to pay for this generation (covers the server's price). Defaults
   * to 3. A payment ≥ the server's price is accepted; overpay is wasted, so set
   * this to the instance's 3D price.
   */
  priceUsd?: number
}

export class PixAI {
  readonly address: string
  private keypair: Keypair
  private baseUrl: string
  private rpcUrl: string
  private fetchImpl: typeof fetch
  private conn: Connection | null = null
  private cookie: string | null = null

  constructor(opts: PixAIOptions) {
    const sk = typeof opts.secretKey === 'string' ? bs58.decode(opts.secretKey) : opts.secretKey
    this.keypair = Keypair.fromSecretKey(sk)
    this.address = this.keypair.publicKey.toBase58()
    this.baseUrl = (opts.baseUrl ?? 'https://pixai.studio').replace(/\/$/, '')
    this.rpcUrl = opts.rpcUrl ?? 'https://api.mainnet-beta.solana.com'
    const f = opts.fetch ?? globalThis.fetch
    if (!f) throw new Error('No fetch available — pass opts.fetch (Node <18).')
    this.fetchImpl = f
  }

  private connection(): Connection {
    if (!this.conn) this.conn = new Connection(this.rpcUrl, 'confirmed')
    return this.conn
  }

  private url(path: string): string {
    return path.startsWith('http') ? path : this.baseUrl + path
  }

  /** Low-level request with auth cookie attached. Throws on non-2xx. */
  async request(path: string, init: RequestInit & { json?: unknown } = {}): Promise<Response> {
    const headers: Record<string, string> = { ...(init.headers as Record<string, string>) }
    if (this.cookie) headers['cookie'] = this.cookie
    let body = init.body
    if (init.json !== undefined) {
      headers['content-type'] = 'application/json'
      body = JSON.stringify(init.json)
    }
    const res = await this.fetchImpl(this.url(path), { ...init, headers, body })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`PIXAI ${path} → ${res.status}: ${text.slice(0, 300)}`)
    }
    return res
  }

  private async json<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
    return (await this.request(path, init)).json() as Promise<T>
  }

  /** Prove wallet ownership (Sign-In with Solana) and capture the session. */
  async signIn(): Promise<void> {
    const nonce = await this.json<{ issuedAt: number; message: string }>('/api/auth/nonce', {
      method: 'POST',
      json: { address: this.address },
    })
    if (!nonce.message) throw new Error('Sign-in nonce failed.')
    const sig = ed25519.sign(new TextEncoder().encode(nonce.message), this.keypair.secretKey.slice(0, 32))
    const res = await this.fetchImpl(this.url('/api/auth/verify'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: this.address, issuedAt: nonce.issuedAt, signature: bs58.encode(sig) }),
    })
    if (!res.ok) throw new Error(`Sign-in verify failed: ${res.status}`)
    const setCookie =
      (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ??
      [res.headers.get('set-cookie') ?? '']
    const joined = setCookie.join('; ')
    const m = /ig_session=[^;]+/.exec(joined)
    if (!m) throw new Error('No session cookie returned by /api/auth/verify.')
    this.cookie = m[0]
  }

  private async ensureAuth(): Promise<void> {
    if (!this.cookie) await this.signIn()
  }

  /** Live payment config of the instance. */
  async getPrice(): Promise<PriceInfo> {
    return this.json<PriceInfo>('/api/price')
  }

  /**
   * Pay `usd` worth from the wallet using the instance's rail ($PIXAI burn or
   * SOL). Returns the transaction signature, or null when generation is free
   * (no payment configured). Sends + confirms on-chain.
   */
  async pay(usd: number): Promise<string | null> {
    const price = await this.getPrice()
    if (!price.live || !price.tokenUsd) return null
    const conn = this.connection()
    const payer = this.keypair.publicKey
    const units = (usd * 1.03) / price.tokenUsd // +3% buffer for price drift
    const tx = new Transaction()

    if (price.payInSol) {
      if (!price.treasury) throw new Error('Instance is in SOL mode but has no treasury.')
      const lamports = Math.round(units * 1_000_000_000)
      if (lamports <= 0) throw new Error('Payment rounds to zero.')
      tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: new PublicKey(price.treasury), lamports }))
    } else {
      if (!price.mint) throw new Error('Instance is in token mode but exposes no mint.')
      const mint = new PublicKey(price.mint)
      const info = await conn.getParsedAccountInfo(mint)
      if (!info.value) throw new Error('Token mint not found on this RPC.')
      const programId = info.value.owner
      const decimals = (info.value.data as { parsed?: { info?: { decimals?: number } } }).parsed?.info?.decimals ?? 6
      const total = BigInt(Math.round(units * 10 ** decimals))
      if (total <= 0n) throw new Error('Payment rounds to zero.')
      const burnBps = BigInt(Math.max(0, Math.min(10000, price.burnBps ?? 0)))
      const burnAmt = (total * burnBps) / 10000n
      const treAmt = total - burnAmt
      const payerAta = getAssociatedTokenAddressSync(mint, payer, false, programId)
      if (burnAmt > 0n) {
        tx.add(createBurnCheckedInstruction(payerAta, mint, payer, burnAmt, decimals, [], programId))
      }
      if (treAmt > 0n && price.treasury) {
        const tre = new PublicKey(price.treasury)
        const treAta = getAssociatedTokenAddressSync(mint, tre, false, programId)
        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(payer, treAta, tre, mint, programId),
          createTransferCheckedInstruction(payerAta, mint, treAta, payer, treAmt, decimals, [], programId)
        )
      }
    }

    const { blockhash } = await conn.getLatestBlockhash()
    tx.recentBlockhash = blockhash
    tx.feePayer = payer
    const sig = await conn.sendTransaction(tx, [this.keypair])
    await conn.confirmTransaction(sig, 'confirmed').catch(() => {})
    return sig
  }

  /** Whether the instance has 3D generation enabled. */
  async is3DLive(): Promise<boolean> {
    const d = await this.json<{ live?: boolean }>('/api/generate-3d')
    return Boolean(d.live)
  }

  /** Generate a 3D model. Auths + pays automatically, returns the asset URLs. */
  async generate3D(input: Generate3DInput): Promise<Model3DResult> {
    await this.ensureAuth()
    const txSignature = await this.pay(input.priceUsd ?? 3)
    return this.json<Model3DResult>('/api/generate-3d', {
      method: 'POST',
      json: {
        prompt: input.prompt,
        artStyle: input.artStyle,
        topology: input.topology,
        targetPolycount: input.targetPolycount,
        txSignature,
      },
    })
  }

  /** Marketplace reads. */
  marketplace = {
    list: (opts: { q?: string; sort?: 'new' | 'price' } = {}) => {
      const p = new URLSearchParams()
      if (opts.q) p.set('q', opts.q)
      if (opts.sort) p.set('sort', opts.sort)
      const qs = p.toString()
      return this.json(`/api/marketplace${qs ? '?' + qs : ''}`)
    },
    get: (id: string) => this.json(`/api/marketplace/${id}`),
  }
}

export default PixAI
