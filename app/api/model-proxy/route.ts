import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/model-proxy?url=<glb-url>
 * Streams a 3D model through our origin so <model-viewer> can load it without
 * the third-party CORS issues that leave the viewer blank. Blocks internal
 * hosts (SSRF guard).
 */
function isBlockedHost(host: string): boolean {
  const h = host.toLowerCase()
  return (
    h === 'localhost' ||
    h === '0.0.0.0' ||
    h.endsWith('.local') ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  )
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' || isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 403 })
  }

  const path = parsed.pathname.toLowerCase()
  const ct = path.endsWith('.glb')
    ? 'model/gltf-binary'
    : path.endsWith('.gltf')
      ? 'model/gltf+json'
      : 'application/octet-stream'

  // Retry — the connection to the asset CDN can be flaky.
  let lastErr: unknown = null
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) {
        lastErr = `upstream ${res.status}`
        continue
      }
      const buf = await res.arrayBuffer()
      return new NextResponse(buf, {
        headers: {
          'Content-Type': ct,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    } catch (e) {
      lastErr = e
      await new Promise((r) => setTimeout(r, 1500))
    }
  }
  console.error('[model-proxy] failed:', lastErr)
  return NextResponse.json({ error: 'fetch failed' }, { status: 502 })
}
