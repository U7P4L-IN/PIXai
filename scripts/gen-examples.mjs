// Generate landing-page example assets THROUGH the project's own pipeline:
// same OpenRouter endpoint, model, request shape and response parsing the
// /api/generate route uses (app/api/generate/route.ts), with our key.
// Output → public/examples/*.png
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd())
const OUT = path.join(ROOT, 'public', 'examples')
fs.mkdirSync(OUT, { recursive: true })

// --- load OPENROUTER_API_KEY from .env.local ---
const env = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8')
const KEY = (env.match(/^OPENROUTER_API_KEY=(.+)$/m) || [])[1]?.trim()
if (!KEY) throw new Error('OPENROUTER_API_KEY not found in .env.local')

const MODEL = process.env.MODEL || 'google/gemini-3.1-flash-image-preview'

const SUPPORTED = ['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']
const arVal = (r) => { const [w,h] = r.split(':').map(Number); return w/h }
const aspectFor = (w,h) => {
  const t = w/h
  return SUPPORTED.map(r => ({ r, e: Math.abs(Math.log(arVal(r)/t)) }))
    .sort((a,b) => a.e-b.e)[0].r
}

const NEG = 'No text, no captions, no labels, no watermark, no UI chrome, no grid lines, no borders.'
const ASSETS = [
  {
    name: 'sprite', w: 1024, h: 1024,
    prompt: `16-bit pixel art game character: a heroic knight in shining plated armor with a blue tabard, holding a longsword and a round shield, full body, side profile facing right, crisp clean pixels, rich limited retro palette, soft rim light, centered on a plain dark charcoal studio background. Polished game-ready hero sprite. ${NEG}`,
  },
  {
    name: 'tileset', w: 1024, h: 1024,
    prompt: `Polished hand-painted 2D side-scroller platformer terrain tile: a chunky grassy-dirt platform block with stony pebbled edges and lush tufts of grass and small flowers along the top, warm painterly fantasy game art, even lighting, clean and game-ready, on a plain dark charcoal studio background. ${NEG}`,
  },
  {
    name: 'parallax', w: 1024, h: 576,
    prompt: `Wide multi-layer parallax background for a 2D side-scroller: a misty layered forest at golden dawn — soft glowing sky, distant blue mountains, mid-ground silhouetted pines, detailed foreground ferns and bushes, atmospheric depth, painterly cohesive fantasy game art, no characters. ${NEG}`,
  },
  {
    name: 'props', w: 1024, h: 1024,
    prompt: `A tidy atlas sheet of fantasy game prop icons arranged in a clean grid: a wooden treasure chest, a red potion bottle, an ornate golden key, a glowing blue gem, a brass lantern, a spotted mushroom, a stack of gold coins, a rolled scroll — hand-painted consistent style, soft shading, each isolated on a plain dark charcoal studio background. ${NEG}`,
  },
  {
    name: 'model3d', w: 1024, h: 1024,
    prompt: `Stylized low-poly 3D render of a fantasy treasure chest game asset: faceted polygons, hand-painted textures, wooden body with iron bands and a gold lock, soft three-point studio lighting, three-quarter view, neutral dark studio background, game-ready prop. ${NEG}`,
  },
]

async function genOne(a, attempt = 1) {
  const body = {
    model: MODEL,
    messages: [{ role: 'user', content: [{ type: 'text', text: a.prompt }] }],
    modalities: ['image', 'text'],
    image_config: { aspect_ratio: aspectFor(a.w, a.h) },
    max_tokens: 2000,
    temperature: 0.7,
  }
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'PIXAI - Generator',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 300)}`)
  }
  const data = await res.json()
  const message = data.choices?.[0]?.message
  if (!message) throw new Error('no message')

  let imageUrl = null
  if (Array.isArray(message.images) && message.images[0]?.image_url?.url) {
    imageUrl = message.images[0].image_url.url
  }
  if (!imageUrl) {
    const c = message.content
    if (Array.isArray(c)) {
      for (const part of c) {
        if (part.type === 'image_url' && part.image_url?.url) { imageUrl = part.image_url.url; break }
        if (part.type === 'image' && part.url) { imageUrl = part.url; break }
        if (part.image_url?.data) { imageUrl = `data:image/png;base64,${part.image_url.data}`; break }
        if (part.data) { imageUrl = `data:image/png;base64,${part.data}`; break }
        if (part.inline_data?.data) { imageUrl = `data:${part.inline_data.mime_type || 'image/png'};base64,${part.inline_data.data}`; break }
      }
    } else if (typeof c === 'string' && (c.startsWith('data:image') || c.startsWith('http'))) {
      imageUrl = c
    }
  }
  if (!imageUrl) throw new Error('no image in response')

  let buf
  if (imageUrl.startsWith('data:')) {
    buf = Buffer.from(imageUrl.split(',')[1], 'base64')
  } else {
    const ir = await fetch(imageUrl)
    buf = Buffer.from(await ir.arrayBuffer())
  }
  const file = path.join(OUT, `${a.name}.png`)
  fs.writeFileSync(file, buf)
  return { file, bytes: buf.length }
}

const results = []
for (const a of ASSETS) {
  let ok = false
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      process.stdout.write(`[${a.name}] try ${attempt} ... `)
      const r = await genOne(a, attempt)
      console.log(`OK ${(r.bytes / 1024).toFixed(0)}kb -> ${path.relative(ROOT, r.file)}`)
      results.push({ name: a.name, ok: true })
      ok = true
    } catch (e) {
      console.log(`FAIL ${e.message}`)
      if (attempt === 3) results.push({ name: a.name, ok: false, err: e.message })
    }
  }
}
console.log('\nSUMMARY:', JSON.stringify(results))
