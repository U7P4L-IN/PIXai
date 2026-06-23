/**
 * Direct pay-per-generation (server-only). No prepaid balance: each generation
 * is funded by a wallet payment to the treasury. A single payment funds exactly
 * its USD value of generation work (so one user action that fans out into a few
 * internal calls is covered by one payment), and is only *spent* on success —
 * a failed generation leaves the payment valid for a free retry.
 *
 * Payment state is in-memory (payments are used immediately after sending), keyed
 * by txSignature. Verification reads the transfer to the treasury via RPC.
 */
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { PAY_IN_SOL, TOKEN } from '@/app/lib/credits'
import { getTokenUsdPrice } from '@/app/lib/server/tokenPrice'

const WINDOW_MS = 15 * 60 * 1000
const RPC =
  process.env.SOLANA_RPC_URL ||
  (TOKEN.NETWORK === 'solana-mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com')

interface Payment {
  wallet: string
  verifiedCents: number
  spentCents: number
  at: number
}
const payments = new Map<string, Payment>()

type Meta = {
  preTokenBalances?: readonly unknown[] | null
  postTokenBalances?: readonly unknown[] | null
} | null

/** post-minus-pre UI amount of `mint` held by `owner` (negative if they sent). */
function tokenDelta(meta: Meta, mint: string, owner: string): number {
  if (!meta) return 0
  type Bal = { mint: string; owner?: string; uiTokenAmount: { uiAmount: number | null } }
  const amt = (arr: readonly unknown[] | null | undefined) =>
    (arr as Bal[] | undefined)?.find((x) => x.mint === mint && x.owner === owner)?.uiTokenAmount
      .uiAmount ?? 0
  return amt(meta.postTokenBalances) - amt(meta.preTokenBalances)
}

/** Lamports the `owner` account received across the transaction. */
function solReceived(
  tx: {
    transaction: { message: { accountKeys: { pubkey: { toBase58(): string } }[] } }
    meta: { preBalances?: number[] | null; postBalances?: number[] | null } | null
  },
  owner: string
): number {
  const keys = tx.transaction?.message?.accountKeys ?? []
  const idx = keys.findIndex((k) => k.pubkey.toBase58() === owner)
  if (idx < 0 || !tx.meta) return 0
  return (tx.meta.postBalances?.[idx] ?? 0) - (tx.meta.preBalances?.[idx] ?? 0)
}

export interface PayResult {
  ok: boolean
  status?: number
  code?: string
  error?: string
}

/**
 * Verify (first sight) + check a payment can cover `costCents` more work.
 * Does NOT spend — call spendPayment() after the generation succeeds.
 */
export async function checkPayment(
  txSignature: string,
  wallet: string,
  costCents: number
): Promise<PayResult> {
  let p = payments.get(txSignature)

  if (!p) {
    try {
      const conn = new Connection(RPC, 'confirmed')
      // Poll: the payment may not have propagated to this RPC node yet.
      let tx = null
      for (let i = 0; i < 8; i++) {
        tx = await conn
          .getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 })
          .catch(() => null)
        if (tx) break
        await new Promise((r) => setTimeout(r, 2500))
      }
      if (!tx) {
        return { ok: false, status: 425, code: 'TX_PENDING', error: 'Payment not seen yet — wait a few seconds and click Generate again.' }
      }
      if (tx.meta?.err) {
        return { ok: false, status: 400, code: 'TX_FAILED', error: 'Payment transaction failed on-chain.' }
      }
      const price = await getTokenUsdPrice()
      if (!price) {
        return { ok: false, status: 503, code: 'PRICE', error: 'Price unavailable, try again.' }
      }

      // How many payment units this transaction is worth.
      let units: number
      if (PAY_IN_SOL) {
        // Native SOL: value by the lamports the treasury received.
        const lamports = solReceived(tx, TOKEN.TREASURY)
        if (lamports <= 0) {
          return { ok: false, status: 400, code: 'NO_TRANSFER', error: 'No SOL payment to the treasury in this transaction.' }
        }
        units = lamports / LAMPORTS_PER_SOL
      } else {
        // SPL token: value by the wallet's total outflow (burn + transfer).
        units = -tokenDelta(tx.meta, TOKEN.MINT, wallet)
        if (units <= 0) {
          return { ok: false, status: 403, code: 'NOT_PAYER', error: 'This payment was not sent by your wallet.' }
        }
      }

      p = { wallet, verifiedCents: Math.round(units * price * 100), spentCents: 0, at: Date.now() }
      payments.set(txSignature, p)
    } catch {
      return { ok: false, status: 502, code: 'VERIFY', error: 'Could not verify payment.' }
    }
  }

  if (p.wallet !== wallet) {
    return { ok: false, status: 403, code: 'PAYMENT_WALLET_MISMATCH', error: 'Payment belongs to another wallet.' }
  }
  if (Date.now() - p.at > WINDOW_MS) {
    return { ok: false, status: 402, code: 'PAYMENT_EXPIRED', error: 'Payment expired — pay again.' }
  }
  if (p.spentCents + costCents > p.verifiedCents) {
    return { ok: false, status: 402, code: 'PAYMENT_EXHAUSTED', error: 'Payment does not cover this generation.' }
  }
  return { ok: true }
}

/** Spend `costCents` against a payment. Call only after a successful generation. */
export function spendPayment(txSignature: string, costCents: number): void {
  const p = payments.get(txSignature)
  if (p) p.spentCents += costCents
}

// drop stale payments occasionally
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now()
    payments.forEach((p, k) => {
      if (now - p.at > WINDOW_MS) payments.delete(k)
    })
  }, WINDOW_MS).unref?.()
}
