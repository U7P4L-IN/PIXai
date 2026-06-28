import { NextRequest, NextResponse } from 'next/server'
import { listListings } from '@/app/lib/server/modelStore'
import { MARKET, marketTokenEnabled } from '@/app/lib/credits'

export const dynamic = 'force-dynamic'

/** GET /api/marketplace?q=&sort=new|price → public listings. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || undefined
  const sort = request.nextUrl.searchParams.get('sort') === 'price' ? 'price' : 'new'
  const listings = await listListings({ q, sort })
  return NextResponse.json({ listings, feeBps: MARKET.FEE_BPS, tokenEnabled: marketTokenEnabled() })
}
