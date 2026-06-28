import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { assetPath, getModel, hasAccess, type AssetFmt } from '@/app/lib/server/modelStore'

export const dynamic = 'force-dynamic'

const LOCAL_FILE: Record<AssetFmt, string> = { glb: 'model.glb', fbx: 'model.fbx', obj: 'model.obj' }
const CT: Record<AssetFmt, string> = {
  glb: 'model/gltf-binary',
  fbx: 'application/octet-stream',
  obj: 'text/plain; charset=utf-8',
}

/**
 * GET /api/marketplace/download/[id]?fmt=glb[&inline=1]
 * Serves an asset file ONLY to the owner or a confirmed buyer. `inline=1`
 * returns it for the <model-viewer> (no download disposition).
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const me = getAuthedAddress(request)
  if (!me) {
    return NextResponse.json({ error: 'Sign in to download.', code: 'NO_AUTH' }, { status: 401 })
  }
  if (!(await hasAccess(me, params.id))) {
    return NextResponse.json({ error: 'Purchase required.', code: 'NO_ACCESS' }, { status: 403 })
  }

  const fmtParam = request.nextUrl.searchParams.get('fmt') || 'glb'
  if (fmtParam !== 'glb' && fmtParam !== 'fbx' && fmtParam !== 'obj') {
    return NextResponse.json({ error: 'Bad format.' }, { status: 400 })
  }
  const fmt = fmtParam as AssetFmt
  const inline = request.nextUrl.searchParams.get('inline') === '1'

  const m = await getModel(params.id)
  if (!m) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  const disposition = inline
    ? 'inline'
    : `attachment; filename="pixai-${params.id}.${fmt}"`

  // Prefer the local mirror; fall back to the original remote URL.
  const localName = m.files[fmt]
  if (localName) {
    try {
      const buf = await fs.readFile(assetPath(params.id, localName))
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          'Content-Type': CT[fmt],
          'Content-Disposition': disposition,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'private, max-age=3600',
        },
      })
    } catch {
      /* fall through to remote */
    }
  }

  const remote = m.remote[fmt]
  if (!remote) return NextResponse.json({ error: 'Format unavailable.' }, { status: 404 })
  try {
    const res = await fetch(remote, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ error: 'Upstream unavailable.' }, { status: 502 })
    const buf = await res.arrayBuffer()
    return new NextResponse(buf, {
      headers: {
        'Content-Type': CT[fmt],
        'Content-Disposition': disposition,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Fetch failed.' }, { status: 502 })
  }
}
