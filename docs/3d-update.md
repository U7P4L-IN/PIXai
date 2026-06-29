# PIXAI — 3D Update

The next major expansion: **text → game-ready 3D models**, in the same studio,
paid the same way (per generation, in $PIXAI). This doc covers the vision,
what's already built, what ships in the update, and how it interacts with the
token.

---

## 1. Vision

Bring the PIXAI promise — *prompt in, game asset out* — to the third
dimension. Describe a chest, a creature, a weapon, an environment prop → get a
**low-poly, textured, rigged 3D model**, export-ready for Unity, Godot and
Unreal (GLB / FBX / OBJ).

```
"a low-poly treasure chest, wooden with iron bands"
        │
        ▼
   textured · rigged · game-ready .glb   (in ~60s)
```

2D got indie devs their sprites. The 3D update gets them their **props,
characters and environments** — the rest of the game.

## 2. Current state (shipped as beta)

The 3D studio already exists and is wired end-to-end — it just runs in **mock
mode** until a provider key is added:

- ✅ **Dedicated studio** at `/studio/3d` (separate from the 2D pipeline)
- ✅ **Provider integration**: Meshy text-to-3D (`app/lib/server/meshy.ts`)
- ✅ **GLB viewer** in-browser (orbit / zoom / auto-rotate)
- ✅ **Export buttons**: GLB / FBX / OBJ
- ✅ **Full token wiring**: complexity-based pricing + pay-per-generation
- 🟡 **Mock mode**: with no `MESHY_API_KEY` set, it returns sample models so the
  whole flow (viewer, payment, export) is testable without a paid key

**To go live → add a Meshy Pro key** (`MESHY_API_KEY` in env). No code change:
the provider switches from mock to real generation automatically.

## 3. What ships in the update

| Capability | Status | Notes |
| --- | --- | --- |
| **Text-to-3D** | core (preview implemented) | prompt → geometry |
| **Textures (PBR)** | refine pass | diffuse + normal + roughness/metallic |
| **Auto-rigging** | planned | humanoid / quadruped skeletons |
| **Baked animations** | planned | idle / walk / run / attack / death |
| **Image-to-3D** | planned | turn a generated 2D sprite into a 3D model |
| **Export** | done | GLB / FBX / OBJ + texture bundle |
| **Style match** | planned | match a project's existing art direction |

### Pipeline (Meshy, text-to-3D v2)
```
prompt ──▶ preview (raw geometry)  ──▶ refine (PBR textures)
                                          │
                                          ├──▶ auto-rig (skeleton)
                                          └──▶ animate (baked clips)
                                                    │
                                                    ▼
                                          export: GLB / FBX / OBJ
```
The server creates a task, polls until the model is ready, then returns the
asset URLs. Each heavier step (refine, rig, animate) is an optional add-on the
user can opt into for a higher price.

## 4. Token interaction (3D specifics)

3D uses the **exact same** payment rails as 2D (see
[how-it-works.md](how-it-works.md)) — sign-in, live price, 100% burn, pay-on-success — with one difference: **price scales with complexity.**

- A 3D generation is priced **$2–$15 in USD**, estimated from the prompt
  (length + complexity hints like *rigged, textured, multi-material, character,
  detailed…*).
- That USD price is converted to $PIXAI at the **live market rate** and paid
  from the wallet, **100% burned 🔥**.

```
simple prop      →  ~$2   →  burned 100%
rigged character →  ~$15  →  burned 100%
```

Because 3D generations cost more than 2D, **each one burns more $PIXAI** —
the 3D update is the single biggest driver of token burn on the platform.

> Provider cost reference: a textured Meshy model ≈ **$0.30**; retail $2–$15
> leaves healthy margin; infra is funded by pump.fun dev fees (no treasury cut).

## 5. Road to full release

| Phase | Work | Gate |
| --- | --- | --- |
| **3D.0** *(done)* | Studio, viewer, mock mode, token wiring | — |
| **3D.1** | Add `MESHY_API_KEY`, ship real text-to-3D (preview + refine) | Meshy Pro ($20/mo) |
| **3D.2** | Opt-in rigging + baked animations, tiered pricing | — |
| **3D.3** | Image-to-3D (2D sprite → 3D), style match | — |
| **3D.4** | Full 2D + 3D asset packs in one coherent set | — |

## 6. What's needed to flip it on

1. **Meshy Pro account** → `MESHY_API_KEY` in the server env (Pro includes API
   access; ~$0.10–0.30 per model in Meshy credits).
2. Confirm the **$2–$15 price band** against real Meshy costs (tune
   `MODEL3D_USD` if needed).
3. Remove the **beta** badge, surface the 3D tab in the studio.
4. Announce — 3D is the strongest **burn narrative**: *the more 3D models built,
   the more $PIXAI destroyed.*

## 7. Where the code lives

| Concern | File |
| --- | --- |
| 3D studio UI | `app/studio/3d/page.tsx` |
| Meshy provider (mock + live) | `app/lib/server/meshy.ts` |
| Generation endpoint | `app/api/generate-3d/route.ts` |
| Complexity pricing ($2–$15) | `estimate3DUsd` in `app/lib/credits.ts` |
| GLB viewer types | `app/types/model-viewer.d.ts` |

---

**In one sentence:** the 3D update turns prompts into rigged, textured,
engine-ready 3D models — priced $2–$15 by complexity, paid in $PIXAI with
100% of every payment burned, making it the platform's biggest deflation engine.
