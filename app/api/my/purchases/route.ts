import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { purchasesOf } from '@/app/lib/server/modelStore'

export const dynamic = 'force-dynamic'

/** GET /api/my/purchases → listings the caller has bought (downloads unlocked). */
export async function GET(request: NextRequest) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in with your wallet.', code: 'NO_AUTH' }, { status: 401 })
  }
  const purchases = await purchasesOf(me)
  return NextResponse.json({ purchases })
}
