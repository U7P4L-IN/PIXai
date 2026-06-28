import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { unlist } from '@/app/lib/server/modelStore'

export const dynamic = 'force-dynamic'

/** POST /api/marketplace/unlist { modelId } — remove the caller's listing. */
export async function POST(request: NextRequest) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in with your wallet.', code: 'NO_AUTH' }, { status: 401 })
  }
  const { modelId } = await request.json().catch(() => ({}))
  if (!modelId || typeof modelId !== 'string') {
    return NextResponse.json({ error: 'Missing model.' }, { status: 400 })
  }
  const ok = await unlist(modelId, me)
  if (!ok) return NextResponse.json({ error: 'Not found or not yours.' }, { status: 403 })
  return NextResponse.json({ ok: true })
}
