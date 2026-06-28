import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { getModel, hasPurchased, recordPurchase } from '@/app/lib/server/modelStore'
import { verifySolPayment, verifyTokenPayment } from '@/app/lib/server/marketplacePayments'
import { MARKET, TOKEN, feeShares, solToLamports } from '@/app/lib/credits'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketplace/buy
 * Body: { modelId, txSignature }
 * Verifies the buyer's on-chain SOL payment reached the seller (and the platform
 * fee reached the treasury, if configured), then records the purchase, which
 * unlocks downloads. Idempotent — already-owned models return ok immediately.
 */
export async function POST(request: NextRequest) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in with your wallet to buy.', code: 'NO_AUTH' }, { status: 401 })
  }

  const { modelId, txSignature } = await request.json().catch(() => ({}))
  if (!modelId || typeof modelId !== 'string') {
    return NextResponse.json({ error: 'Missing model.' }, { status: 400 })
  }

  const m = await getModel(modelId)
  if (!m || !m.listed || !m.price) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }
  const currency = m.currency ?? 'sol'
  if (m.owner === me) {
    return NextResponse.json({ ok: true, owned: true })
  }
  // Already bought — no need to pay again.
  if (await hasPurchased(me, modelId)) {
    return NextResponse.json({ ok: true, alreadyOwned: true })
  }

  if (!txSignature || typeof txSignature !== 'string') {
    return NextResponse.json(
      { error: 'Payment required.', code: 'PAYMENT_REQUIRED', currency, price: m.price },
      { status: 402 }
    )
  }

  // Server is authoritative on the split (client must match).
  const { fee, seller } = feeShares(m.price, MARKET.FEE_BPS)
  const pay =
    currency === 'token'
      ? await verifyTokenPayment({
          txSignature,
          buyer: me,
          seller: m.owner,
          mint: TOKEN.MINT,
          sellerTokens: seller,
          feeTokens: fee,
        })
      : await verifySolPayment({
          txSignature,
          buyer: me,
          seller: m.owner,
          sellerLamports: solToLamports(seller),
          feeLamports: solToLamports(fee),
        })
  if (!pay.ok) {
    return NextResponse.json({ error: pay.error, code: pay.code }, { status: pay.status ?? 402 })
  }

  await recordPurchase({
    modelId,
    buyer: me,
    seller: m.owner,
    currency,
    price: m.price,
    txSignature,
  })
  return NextResponse.json({ ok: true })
}
