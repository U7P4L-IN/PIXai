import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { assetPath, getModel } from '@/app/lib/server/modelStore'

export const dynamic = 'force-dynamic'

/**
 * GET /api/marketplace/thumb/[id] — public preview image for a listing.
 * Thumbnails are renders (not the sellable asset), so they're ungated. Serves
 * the local mirror, falling back to the original remote URL.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const m = await getModel(params.id)
  if (!m) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  if (m.thumb) {
    try {
      const buf = await fs.readFile(assetPath(params.id, m.thumb))
      return new NextResponse(new Uint8Array(buf), {
        headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
      })
    } catch {
      /* fall through to remote */
    }
  }
  if (m.remote.thumb) {
    try {
      const res = await fetch(m.remote.thumb, { cache: 'no-store' })
      if (res.ok) {
        const buf = await res.arrayBuffer()
        return new NextResponse(buf, {
          headers: {
            'Content-Type': res.headers.get('content-type') || 'image/png',
            'Cache-Control': 'public, max-age=86400',
          },
        })
      }
    } catch {
      /* ignore */
    }
  }
  return NextResponse.json({ error: 'No thumbnail.' }, { status: 404 })
}
