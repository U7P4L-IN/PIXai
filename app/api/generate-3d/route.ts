import { NextRequest, NextResponse } from 'next/server'
import { gateRequest, settle } from '@/app/lib/server/charge'
import { estimate3DUsd, usdToCents, usdToTokens } from '@/app/lib/credits'
import { getTokenUsdPrice } from '@/app/lib/server/tokenPrice'
import { generate3D, isMeshyConfigured } from '@/app/lib/server/meshy'
import { createModel } from '@/app/lib/server/modelStore'

// 3D generation can take a while (Meshy preview ~30–60s).
export const maxDuration = 300

/**
 * POST /api/generate-3d
 * Body: { prompt, txSignature?, artStyle?, topology?, targetPolycount? }
 * Pay-per-generation (model3d); the payment is spent only on success.
 */
export async function POST(request: NextRequest) {
  try {
    // 3D is gated until Meshy is configured (the post-launch update).
    if (!isMeshyConfigured()) {
      return NextResponse.json(
        { error: '3D generation is coming soon.', code: 'THREE_D_OFF' },
        { status: 403 }
      )
    }

    const { prompt, txSignature, artStyle, topology, targetPolycount } =
      await request.json().catch(() => ({}))

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return NextResponse.json({ error: 'Describe the model you want.' }, { status: 400 })
    }

    // Price scales with prompt complexity ($2–$15); charged exactly.
    const priceUsd = estimate3DUsd(prompt)
    const gate = await gateRequest(request, 'model3d', { overrideCents: usdToCents(priceUsd), txSignature })
    if ('error' in gate) return gate.error

    const result = await generate3D({
      prompt: prompt.trim(),
      artStyle,
      topology,
      targetPolycount,
    })

    if (!result.modelUrl) {
      return NextResponse.json({ error: 'No model returned.' }, { status: 502 })
    }
    console.log('[3d] modelUrl:', result.modelUrl)

    // Success — deduct the exact USD-priced amount.
    await settle(gate)

    // Persist the model (owned by the generating wallet) so it can be listed on
    // the marketplace. Best-effort: a storage failure must not fail the request.
    let modelId: string | undefined
    try {
      const rec = await createModel(gate.address, {
        prompt: prompt.trim(),
        artStyle,
        taskId: result.taskId,
        mock: result.mock,
        modelUrl: result.modelUrl,
        thumbnailUrl: result.thumbnailUrl,
        formats: result.formats,
      })
      modelId = rec.id
    } catch (e) {
      console.error('[3d] persist model failed:', e)
    }

    const tokenUsd = await getTokenUsdPrice()
    const priceTokens = tokenUsd ? usdToTokens(priceUsd, tokenUsd) : null
    return NextResponse.json({ ...result, modelId, priceUsd, priceTokens, tokenUsd })
  } catch (error) {
    console.error('Error in generate-3d route:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

/** GET /api/generate-3d — provider status (live vs mock). */
export async function GET() {
  return NextResponse.json({ provider: 'meshy', live: isMeshyConfigured() })
}
