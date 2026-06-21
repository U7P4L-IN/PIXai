import { NextRequest, NextResponse } from 'next/server'
import { isValidPubkey, issueNonce } from '@/app/lib/server/auth'

/** POST /api/auth/nonce { address } → { issuedAt, message } to sign. */
export async function POST(request: NextRequest) {
  const { address } = await request.json().catch(() => ({}))
  if (!isValidPubkey(address)) {
    return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
  }
  return NextResponse.json(issueNonce(address))
}
