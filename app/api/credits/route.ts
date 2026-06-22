import { NextRequest, NextResponse } from 'next/server'
import { getAccount } from '@/app/lib/server/creditStore'

/** GET /api/credits?address=<wallet> — balance + recent history. */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address')?.trim()
  if (!address) {
    return NextResponse.json({ error: 'address required' }, { status: 400 })
  }
  const acc = await getAccount(address)
  return NextResponse.json({
    address,
    credits: acc.credits,
    history: acc.history.slice(-20).reverse(),
  })
}
