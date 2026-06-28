import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { listForSale, type MarketCurrency } from '@/app/lib/server/modelStore'
import { MARKET, marketTokenEnabled } from '@/app/lib/credits'

export const dynamic = 'force-dynamic'

/**
 * POST /api/marketplace/list
 * Body: { modelId, title, currency: 'sol'|'token', price, description? }
 * Lists one of the caller's own generated models for sale in the chosen currency.
 */
export async function POST(request: NextRequest) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in with your wallet.', code: 'NO_AUTH' }, { status: 401 })
  }

  const { modelId, title, currency, price: priceRaw, description } = await request.json().catch(() => ({}))

  if (!modelId || typeof modelId !== 'string') {
    return NextResponse.json({ error: 'Missing model.' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'Give your model a title.' }, { status: 400 })
  }
  const cur: MarketCurrency = currency === 'token' ? 'token' : 'sol'
  if (cur === 'token' && !marketTokenEnabled()) {
    return NextResponse.json({ error: 'Token payments are not available yet.' }, { status: 400 })
  }

  const price = Number(priceRaw)
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json({ error: 'Enter a valid price.' }, { status: 400 })
  }
  if (cur === 'sol' && (price < MARKET.MIN_SOL || price > MARKET.MAX_SOL)) {
    return NextResponse.json(
      { error: `Price must be between ${MARKET.MIN_SOL} and ${MARKET.MAX_SOL} SOL.` },
      { status: 400 }
    )
  }

  const result = await listForSale(modelId, me, {
    title: title.trim(),
    description: typeof description === 'string' ? description.trim() : undefined,
    currency: cur,
    price,
  })
  if ('error' in result) {
    const status = result.error === 'NOT_OWNER' ? 403 : 404
    return NextResponse.json({ error: result.error }, { status })
  }
  return NextResponse.json({ ok: true, listing: { id: result.id, title: result.title, currency: result.currency, price: result.price } })
}
