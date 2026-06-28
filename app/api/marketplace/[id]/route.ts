import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { getModel, hasPurchased, toPublic } from '@/app/lib/server/modelStore'
import { MARKET, TOKEN } from '@/app/lib/credits'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketplace/[id] → listing detail (public projection) plus the
 * requester's relationship to it (owned / purchased) so the client knows
 * whether to show Buy vs Download.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const m = await getModel(params.id)
  if (!m || !m.listed) {
    return NextResponse.json({ error: 'Listing not found.' }, { status: 404 })
  }
  const me = getAuthedAddress(request)
  const owned = Boolean(me && me === m.owner)
  const purchased = me ? owned || (await hasPurchased(me, m.id)) : false

  const listing = toPublic(m)
  return NextResponse.json({
    listing,
    seller: m.owner,
    feeBps: MARKET.FEE_BPS,
    treasury: MARKET.TREASURY || null,
    // Token mint is only needed (and surfaced) for token-priced listings.
    mint: listing.currency === 'token' ? TOKEN.MINT || null : null,
    owned,
    purchased,
    canDownload: purchased,
  })
}
