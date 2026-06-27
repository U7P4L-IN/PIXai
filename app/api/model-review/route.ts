import { NextRequest, NextResponse } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { rateLimit } from '@/app/lib/server/ratelimit'

/**
 * POST /api/model-review — "AI art-director review" of a freshly generated 3D
 * model. A friendly, constructive one-liner + a score, shown under the viewer.
 *
 * Free value-add (auth + rate-limit only, NO payment): it's flavour, not a
 * billable generation. Uses the shared OpenRouter vision model on the model's
 * thumbnail when available, else a text-only take from the prompt.
 */
const DEFAULT_MODEL = 'google/gemini-2.5-flash'

const SYSTEM = `You are a warm, encouraging SENIOR 3D ART DIRECTOR giving a quick take on a freshly AI-generated, game-ready 3D model. Be genuine and constructive — NOT sarcastic, snarky, or mean.

Give a short professional review: 1–2 sentences. Lead with what works (form, silhouette, readability, style fit, game-readiness), then at most ONE gentle, actionable tip if it helps. Keep it natural and human, like a colleague glancing at your work.

Then give a score from 1 to 10 (most solid models land 7–9; reserve 10 for genuinely great, below 6 only for clearly broken results).

Respond with STRICT JSON only, no markdown:
{"review": "your 1-2 sentence review", "score": <integer 1-10>}`

function parse(raw: string): { review: string; score: number } | null {
  if (!raw) return null
  const text = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s)
    } catch {
      return null
    }
  }
  let data: unknown = tryParse(text)
  if (!data) {
    const s = text.indexOf('{')
    const e = text.lastIndexOf('}')
    if (s !== -1 && e > s) data = tryParse(text.slice(s, e + 1))
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const review = typeof o.review === 'string' ? o.review.trim() : ''
    const score = Math.max(1, Math.min(10, Math.round(Number(o.score) || 0)))
    if (review) return { review, score: score || 8 }
  }
  // Fallback: treat the whole thing as the review text.
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean ? { review: clean.slice(0, 240), score: 8 } : null
}

export async function POST(request: NextRequest) {
  try {
    const me = getAuthedAddress(request)
    if (!me) {
      return NextResponse.json({ error: 'Sign in with your wallet.', code: 'NO_AUTH' }, { status: 401 })
    }
    const rl = rateLimit(`review:${me}`)
    if (!rl.ok) {
      return NextResponse.json({ error: 'Slow down.', code: 'RATE_LIMITED' }, { status: 429 })
    }

    const { prompt, thumbnailUrl, apiKey, model } = await request.json().catch(() => ({}))

    const openRouterKey =
      typeof apiKey === 'string' && apiKey.trim() ? apiKey.trim() : process.env.OPENROUTER_API_KEY
    if (!openRouterKey) {
      // No key → silently skip (the review is optional flavour).
      return NextResponse.json({ review: null })
    }

    const modelId = typeof model === 'string' && model.trim() ? model.trim() : DEFAULT_MODEL
    const hasImage = typeof thumbnailUrl === 'string' && /^https?:\/\/|^data:image\//.test(thumbnailUrl)

    const userText = `Model prompt: "${(prompt || '').toString().trim() || 'untitled 3D model'}".${
      hasImage ? ' A render of the model is attached.' : ' (No render available — judge from the description.)'
    } Give your quick art-director review as strict JSON.`

    const content: Array<Record<string, unknown>> = []
    if (hasImage) content.push({ type: 'image_url', image_url: { url: thumbnailUrl } })
    content.push({ type: 'text', text: userText })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': request.headers.get('referer') || 'http://localhost:3000',
        'X-Title': 'PIXAI - Model Review',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content },
        ],
        max_tokens: 180,
        temperature: 0.6,
      }),
    })

    if (!response.ok) {
      return NextResponse.json({ review: null })
    }
    const data = await response.json()
    const raw = data.choices?.[0]?.message?.content
    const txt =
      typeof raw === 'string'
        ? raw
        : Array.isArray(raw)
          ? raw.map((p: { text?: string }) => (typeof p?.text === 'string' ? p.text : '')).join('')
          : ''

    const parsed = parse(txt)
    return NextResponse.json(parsed ?? { review: null })
  } catch (error) {
    console.error('Error in model-review route:', error)
    return NextResponse.json({ review: null })
  }
}
