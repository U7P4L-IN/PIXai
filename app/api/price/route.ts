import { NextResponse } from 'next/server'
import { BURN_BPS, PAY_IN_SOL, TOKEN, isPaymentLive } from '@/app/lib/credits'
import { getTokenUsdPrice } from '@/app/lib/server/tokenPrice'

// Must run per-request (live price), never statically cached.
export const dynamic = 'force-dynamic'
export const revalidate = 0

/** GET /api/price → live payment price for client-side USD↔unit display. */
export async function GET() {
  const tokenUsd = await getTokenUsdPrice()
  return NextResponse.json({
    symbol: PAY_IN_SOL ? 'SOL' : 'PIXAI',
    payInSol: PAY_IN_SOL,
    mint: PAY_IN_SOL ? null : TOKEN.MINT || null,
    treasury: TOKEN.TREASURY || null,
    network: TOKEN.NETWORK,
    live: isPaymentLive(),
    burnBps: PAY_IN_SOL ? 0 : BURN_BPS, // no burn for native SOL
    tokenUsd, // $ per payment unit (SOL or token)
  })
}
