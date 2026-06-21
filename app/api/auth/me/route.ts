import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { getAccount } from '@/app/lib/server/creditStore'

/** GET /api/auth/me → { address, credits } if signed in, else { address: null }. */
export async function GET(request: NextRequest) {
  const address = getAuthedAddress(request)
  if (!address) return NextResponse.json({ address: null })
  const acc = await getAccount(address)
  return NextResponse.json({ address, credits: acc.credits })
}
