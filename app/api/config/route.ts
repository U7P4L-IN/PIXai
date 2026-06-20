import { NextResponse } from 'next/server'
import { isMeshyConfigured } from '@/app/lib/server/meshy'

export const dynamic = 'force-dynamic'

/**
 * GET /api/config — public client config.
 *  - serverKey: a server-side OpenRouter key exists (studio skips BYOK modal)
 *  - threeDEnabled: Meshy is configured → reveal the 3D studio (the post-launch
 *    update: just set MESHY_API_KEY + restart and 3D appears, no rebuild)
 */
export async function GET() {
  return NextResponse.json({
    serverKey: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
    threeDEnabled: isMeshyConfigured(),
  })
}
