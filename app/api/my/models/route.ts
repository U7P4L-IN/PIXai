import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { ownerModels } from '@/app/lib/server/modelStore'
import { marketTokenEnabled } from '@/app/lib/credits'

export const dynamic = 'force-dynamic'

/**
 * GET /api/my/models → the caller's generated models with listing state, for the
 * "My Models" management view (publish / unlist).
 */
export async function GET(request: NextRequest) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in with your wallet.', code: 'NO_AUTH' }, { status: 401 })
  }
  const models = (await ownerModels(me)).map((m) => ({
    id: m.id,
    title: m.title || m.prompt.slice(0, 60),
    prompt: m.prompt,
    listed: m.listed,
    currency: m.currency ?? null,
    price: m.price ?? null,
    sales: m.sales,
    hasThumb: Boolean(m.thumb || m.remote.thumb),
    createdAt: m.createdAt,
  }))
  return NextResponse.json({ models, tokenEnabled: marketTokenEnabled() })
}
