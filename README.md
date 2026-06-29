# PIXAI

> **$PIXAI CA:** `FiRuJdh2qkBwU2XUhHieyiAqQvx6J3HM1fkdkkPkpump`

**AI Game Asset Studio on Solana.** Generate production-ready 2D sprites,
animations, tilesets, parallax backgrounds and low-poly 3D models in minutes —
export-ready for Unity, Godot and Unreal. Powered by the **$PIXAI** token:
pay per generation, no subscriptions.

🌐 **[pixai.studio](https://pixai.studio)** · 𝕏 **[@PixAI_Studio](https://x.com/PixAI_Studio)**

---

## What it makes

| Studio | Output |
| --- | --- |
| **Sprite** | Animated characters — idle, walk, run, attack, hurt, death — coherent across every frame via two-pass pose mapping. 6 body plans. Spine rig export. |
| **Tiles** | 13-tile autotile sets in one pass, corner-reconciled, with an AI art-director QA review. |
| **Parallax** | Multi-layer sidescroller backdrops with per-layer depth & scroll speed, auto-extended to any width and seam-healed. |
| **Props** | Growing libraries of distinct decoration sprites, deduped each batch, packed into a transparent atlas. |
| **3D** | Low-poly models with PBR textures, exported as GLB / FBX / OBJ, with an instant AI art-director review. |
| **Marketplace** | Buy & sell generated 3D models peer-to-peer in SOL or $PIXAI. |

Exports: PNG spritesheets, per-frame PNGs, JSON manifests, GLB/FBX/OBJ, Spine
skeletons — drop straight into your engine.

## Pricing — pay per generation

Each generation has a fixed USD price, paid directly from your wallet in
**$PIXAI** at the live market rate (no prepaid balance, no subscription). The
payment is only spent on a successful result — a failed generation is free to
retry.

## SDK

Generate assets from code with [`@pixai/sdk`](sdk/) — handles Sign-In with
Solana + payment automatically:

```ts
import { PixAI } from '@pixai/sdk'
const pixai = new PixAI({ secretKey: process.env.SOLANA_SECRET_KEY! })
const model = await pixai.generate3D({ prompt: 'low-poly treasure chest' })
console.log(model.modelUrl)
```

## Tech

- **[Next.js 14](https://nextjs.org/)** (App Router) · React 18 · TypeScript · Tailwind
- **HTML Canvas** for client-side image work · **JSZip** for project bundles
- **[OpenRouter](https://openrouter.ai)** for image + reasoning models; **[Meshy](https://meshy.ai)** for 3D
- **Solana** — wallet auth (Sign-In with Solana), live price oracle (DexScreener)

## Project structure

```
app/
├── api/            Generation + auth + pricing + marketplace endpoints
├── components/     Studio UI (per-workspace) + landing
├── lib/            Domain logic, token config, server (auth, payments, ledger)
├── studio/         The studio app (/studio) + 3D studio (/studio/3d)
├── marketplace/    3D model marketplace
└── page.tsx        Landing page
sdk/                @pixai/sdk — headless client
```

## Development

```bash
npm install
# add OPENROUTER_API_KEY (and optionally MESHY_API_KEY) to .env.local
npm run dev
```

Generation is **free until the token is configured**; set
`NEXT_PUBLIC_TOKEN_MINT` + `NEXT_PUBLIC_TOKEN_TREASURY` (via `npm run set-token`)
to switch on paid per-generation mode.

## License

MIT
