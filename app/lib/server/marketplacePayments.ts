/**
 * Marketplace payment verification (server-only). A buyer pays the seller's
 * wallet directly in native SOL (peer-to-peer), with an optional platform fee
 * to the treasury. We verify the on-chain transaction confirmed and moved the
 * expected lamports to the seller (and the fee to the treasury, if any), and
 * that the buyer was the payer.
 *
 * Always native SOL — independent of the generation payment rail (which may be
 * SOL or the SPL token).
 */
import { Connection } from '@solana/web3.js'
import { TOKEN } from '@/app/lib/credits'

const RPC =
  process.env.SOLANA_RPC_URL ||
  (TOKEN.NETWORK === 'solana-mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com')

// Allow a small shortfall for rounding between client lamports math and ours.
const TOLERANCE = 0.98

type TokenBal = { mint: string; owner?: string; uiTokenAmount: { uiAmount: number | null } }
type Tx = {
  transaction: { message: { accountKeys: { pubkey: { toBase58(): string } }[] } }
  meta: {
    err: unknown
    preBalances?: number[] | null
    postBalances?: number[] | null
    preTokenBalances?: readonly TokenBal[] | null
    postTokenBalances?: readonly TokenBal[] | null
  } | null
}

/** Net lamports the `owner` account gained (negative if it paid out). */
function solReceived(tx: Tx, owner: string): number {
  const keys = tx.transaction?.message?.accountKeys ?? []
  const idx = keys.findIndex((k) => k.pubkey.toBase58() === owner)
  if (idx < 0 || !tx.meta) return 0
  return (tx.meta.postBalances?.[idx] ?? 0) - (tx.meta.preBalances?.[idx] ?? 0)
}

/** Net UI amount of `mint` the `owner` gained (post − pre; negative if they sent). */
function tokenReceived(tx: Tx, mint: string, owner: string): number {
  if (!tx.meta) return 0
  const amt = (arr: readonly TokenBal[] | null | undefined) =>
    arr?.find((x) => x.mint === mint && x.owner === owner)?.uiTokenAmount.uiAmount ?? 0
  return amt(tx.meta.postTokenBalances) - amt(tx.meta.preTokenBalances)
}

/** Poll RPC for a confirmed, non-failed transaction. */
async function fetchTx(txSignature: string): Promise<{ tx: Tx } | { err: PayResult }> {
  let tx: Tx | null = null
  try {
    const conn = new Connection(RPC, 'confirmed')
    for (let i = 0; i < 8; i++) {
      tx = (await conn
        .getParsedTransaction(txSignature, { maxSupportedTransactionVersion: 0 })
        .catch(() => null)) as Tx | null
      if (tx) break
      await new Promise((r) => setTimeout(r, 2500))
    }
  } catch {
    return { err: { ok: false, status: 502, code: 'VERIFY', error: 'Could not verify payment.' } }
  }
  if (!tx) {
    return {
      err: { ok: false, status: 425, code: 'TX_PENDING', error: 'Payment not seen yet — wait a few seconds and try again.' },
    }
  }
  if (tx.meta?.err) {
    return { err: { ok: false, status: 400, code: 'TX_FAILED', error: 'Payment transaction failed on-chain.' } }
  }
  return { tx }
}

export interface PayResult {
  ok: boolean
  status?: number
  code?: string
  error?: string
}

/**
 * Verify a marketplace SOL payment.
 * @param sellerLamports  expected lamports to the seller
 * @param feeLamports     expected lamports to the treasury (0 = no fee)
 */
export async function verifySolPayment(opts: {
  txSignature: string
  buyer: string
  seller: string
  sellerLamports: number
  feeLamports?: number
}): Promise<PayResult> {
  const { txSignature, buyer, seller, sellerLamports } = opts
  const feeLamports = opts.feeLamports ?? 0

  if (buyer === seller) {
    return { ok: false, status: 400, code: 'SELF_PURCHASE', error: "You can't buy your own model." }
  }

  const res = await fetchTx(txSignature)
  if ('err' in res) return res.err
  const { tx } = res

  // Buyer must be the payer (net lamports out).
  if (solReceived(tx, buyer) >= 0) {
    return { ok: false, status: 403, code: 'NOT_PAYER', error: 'This payment was not sent by your wallet.' }
  }
  // Seller must have received their share.
  if (solReceived(tx, seller) < Math.floor(sellerLamports * TOLERANCE)) {
    return { ok: false, status: 400, code: 'UNDERPAID', error: 'Payment did not cover the listing price.' }
  }
  // Platform fee, if configured, must have reached the treasury.
  if (feeLamports > 0 && TOKEN.TREASURY) {
    if (solReceived(tx, TOKEN.TREASURY) < Math.floor(feeLamports * TOLERANCE)) {
      return { ok: false, status: 400, code: 'FEE_MISSING', error: 'Platform fee was not included.' }
    }
  }
  return { ok: true }
}

/**
 * Verify a marketplace $PIXAI token payment (straight transfer to the seller,
 * no burn).
 * @param mint          the token mint
 * @param sellerTokens  expected whole tokens to the seller
 * @param feeTokens     expected whole tokens to the treasury (0 = no fee)
 */
export async function verifyTokenPayment(opts: {
  txSignature: string
  buyer: string
  seller: string
  mint: string
  sellerTokens: number
  feeTokens?: number
}): Promise<PayResult> {
  const { txSignature, buyer, seller, mint, sellerTokens } = opts
  const feeTokens = opts.feeTokens ?? 0

  if (buyer === seller) {
    return { ok: false, status: 400, code: 'SELF_PURCHASE', error: "You can't buy your own model." }
  }

  const res = await fetchTx(txSignature)
  if ('err' in res) return res.err
  const { tx } = res

  // Buyer must be the payer (net token outflow).
  if (tokenReceived(tx, mint, buyer) >= 0) {
    return { ok: false, status: 403, code: 'NOT_PAYER', error: 'This payment was not sent by your wallet.' }
  }
  // Seller must have received their share.
  if (tokenReceived(tx, mint, seller) < sellerTokens * TOLERANCE) {
    return { ok: false, status: 400, code: 'UNDERPAID', error: 'Payment did not cover the listing price.' }
  }
  // Platform fee, if configured, must have reached the treasury.
  if (feeTokens > 0 && TOKEN.TREASURY) {
    if (tokenReceived(tx, mint, TOKEN.TREASURY) < feeTokens * TOLERANCE) {
      return { ok: false, status: 400, code: 'FEE_MISSING', error: 'Platform fee was not included.' }
    }
  }
  return { ok: true }
}
