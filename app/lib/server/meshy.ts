/**
 * Meshy text-to-3D provider (server-only). Creates a task, polls until the
 * model is ready, and returns the asset URLs.
 *
 * When MESHY_API_KEY is absent we run in MOCK mode: after a short delay we
 * return a known-good sample GLB so the whole studio (viewer, credits, export)
 * is testable without a paid key. Drop a key in .env.local to go live.
 *
 * Docs: https://docs.meshy.ai  (Text to 3D v2)
 */

const MESHY_BASE = 'https://api.meshy.ai/openapi/v2'

/** Public sample model shown in MOCK mode. */
const MOCK_MODELS = [
  'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  'https://modelviewer.dev/shared-assets/models/RobotExpressive.glb',
  'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb',
]

export interface Model3DResult {
  modelUrl: string
  thumbnailUrl?: string
  formats: { glb?: string; fbx?: string; obj?: string }
  mock: boolean
  taskId?: string
}

export type ArtStyle3D = 'realistic' | 'sculpture'

export interface Generate3DParams {
  prompt: string
  artStyle?: ArtStyle3D
  /** target topology — 'quad' is friendlier for rigging. */
  topology?: 'quad' | 'triangle'
  /** approximate polycount budget. */
  targetPolycount?: number
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export function isMeshyConfigured(): boolean {
  return Boolean(process.env.MESHY_API_KEY?.trim())
}

/** Generate a 3D model. Resolves once the GLB is ready (or throws). */
export async function generate3D(params: Generate3DParams): Promise<Model3DResult> {
  const key = process.env.MESHY_API_KEY?.trim()

  // ---- MOCK mode ---------------------------------------------------------
  if (!key) {
    await sleep(1500) // simulate generation latency
    // vary the sample by prompt length so repeated calls differ a little
    const pick = MOCK_MODELS[params.prompt.length % MOCK_MODELS.length]
    return {
      modelUrl: pick,
      formats: { glb: pick },
      mock: true,
    }
  }

  // ---- LIVE mode (Meshy) -------------------------------------------------
  const headers = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }

  // 1) create a preview task (retry — the connection to Meshy can be flaky)
  const body = JSON.stringify({
    mode: 'preview',
    prompt: params.prompt,
    art_style: params.artStyle ?? 'realistic',
    topology: params.topology ?? 'quad',
    target_polycount: params.targetPolycount ?? 30000,
    should_remesh: true,
  })
  let createRes: Response | null = null
  let lastErr: unknown = null
  for (let i = 0; i < 4; i++) {
    try {
      createRes = await fetch(`${MESHY_BASE}/text-to-3d`, { method: 'POST', headers, body })
      if (createRes.ok) break
      lastErr = `${createRes.status} ${await createRes.text()}`
    } catch (e) {
      lastErr = e
    }
    await sleep(2000)
  }
  if (!createRes || !createRes.ok) {
    throw new Error(`Meshy create failed: ${lastErr}`)
  }
  const { result: taskId } = await createRes.json()

  // Poll a task until it finishes.
  const poll = async (id: string, label: string) => {
    const deadline = Date.now() + 6 * 60 * 1000
    while (Date.now() < deadline) {
      await sleep(2500)
      const r = await fetch(`${MESHY_BASE}/text-to-3d/${id}`, { headers }).catch(() => null)
      if (!r || !r.ok) continue
      const t = await r.json()
      if (t.status === 'SUCCEEDED') return t
      if (t.status === 'FAILED') {
        throw new Error(`Meshy ${label} failed: ${t.task_error?.message ?? 'unknown'}`)
      }
    }
    throw new Error(`Meshy ${label} timed out`)
  }

  // 2) preview → base geometry (untextured)
  const preview = await poll(taskId, 'preview')

  // FAST mode — skip the refine (PBR-texture) pass and return the preview model.
  // Roughly halves generation time (~60–90s); the model is untextured. Enable
  // with MESHY_FAST=true (used on localhost for quick testing).
  if (process.env.MESHY_FAST === 'true') {
    const urls = preview.model_urls ?? {}
    if (!urls.glb) throw new Error('Meshy preview returned no model')
    return {
      modelUrl: urls.glb,
      thumbnailUrl: preview.thumbnail_url,
      formats: { glb: urls.glb, fbx: urls.fbx, obj: urls.obj },
      mock: false,
      taskId,
    }
  }

  // 3) refine → add PBR textures (the colored / textured model)
  let refineId = ''
  for (let i = 0; i < 4; i++) {
    try {
      const rr = await fetch(`${MESHY_BASE}/text-to-3d`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode: 'refine', preview_task_id: taskId, enable_pbr: true }),
      })
      if (rr.ok) {
        refineId = (await rr.json()).result
        break
      }
      lastErr = `${rr.status} ${await rr.text()}`
    } catch (e) {
      lastErr = e
    }
    await sleep(2000)
  }
  if (!refineId) throw new Error(`Meshy refine create failed: ${lastErr}`)

  const refined = await poll(refineId, 'refine')
  const urls = refined.model_urls ?? {}
  return {
    modelUrl: urls.glb,
    thumbnailUrl: refined.thumbnail_url,
    formats: { glb: urls.glb, fbx: urls.fbx, obj: urls.obj },
    mock: false,
    taskId: refineId,
  }
}
