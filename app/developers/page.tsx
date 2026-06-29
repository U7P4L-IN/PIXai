import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PIXAI Docs — how it works, studios, marketplace & SDK',
  description:
    'How PIXAI turns a prompt into game-ready 2D and 3D assets — the studios, the generation pipeline, the 3D marketplace, the $PIXAI pay-per-generation model, and the @pixai/sdk for generating assets from code.',
}

const TWITTER_URL = 'https://x.com/PixAI_Studio'
const GITHUB_URL = 'https://github.com/U7P4L-IN/PIXai'
const SDK_URL = 'https://github.com/U7P4L-IN/PIXai/tree/main/sdk'
const TOKEN_CA = 'FiRuJdh2qkBwU2XUhHieyiAqQvx6J3HM1fkdkkPkpump'

const NAV: [string, string][] = [
  ['Studios', '#studios'],
  ['Pipeline', '#how'],
  ['Marketplace', '#marketplace'],
  ['Token', '#token'],
  ['SDK', '#sdk'],
  ['FAQ', '#faq'],
]

const STUDIOS: [string, string, string][] = [
  ['Sprite', 'Characters + animations', 'A two-pass engine first locks a character anchor, then paints every keyframe onto a consistent skeletal pose-map so the whole sheet stays on-model. Six body plans (humanoid, quadruped, serpent, flyer, blob). Exports PNG sheets + JSON manifest, and a ready-to-import Spine rig (skeleton.json + atlas).'],
  ['Tileset', '13-slice autotile sets', 'A full 13-tile autotile set in one pass — edges and corners reconciled, then QA’d by an AI art director and re-painted if anything is off. Drops straight into a tilemap.'],
  ['Parallax', 'Layered backgrounds', 'Multi-layer scrolling scenes with per-layer depth and scroll speed, auto-extended to any width and seam-healed for endless side-scrollers.'],
  ['Props', 'Decoration atlases', 'Batches of distinct, deduplicated decoration sprites, packed into one transparent atlas with a manifest.'],
  ['3D', 'Low-poly models', 'Text to a low-poly, PBR-textured model in a few minutes via Meshy (preview geometry → refine textures). Orbit-preview in the browser, an instant AI art-director review, and export to GLB / FBX / OBJ.'],
  ['Marketplace', 'Buy & sell 3D models', 'List the models you generate and sell them peer-to-peer; buyers pay you directly in SOL or $PIXAI and unlock the downloadable files.'],
]

const STEPS: [string, string, string][] = [
  ['01', 'Connect & sign in', 'Connect a Solana wallet and sign one message (ed25519, Sign-In with Solana). It proves you own the wallet and opens a stateless session cookie — free, no transaction.'],
  ['02', 'Describe the asset', 'Pick a studio and type what you need. The engine plans the passes for you — anchors, keyframes, tile roles, layers, geometry → textures.'],
  ['03', 'Pay & burn', 'The asset’s fixed USD price converts to $PIXAI at the live rate and is burned on-chain in one transaction. The server verifies it before returning anything; a failed generation keeps the payment valid for a free retry.'],
  ['04', 'Export', 'Download engine-ready output — PNG sheets + manifests, atlases, Spine rigs, or GLB / FBX / OBJ — for Unity, Godot and Unreal. Or list a 3D model on the marketplace.'],
]

const TOKEN_FACTS: [string, string][] = [
  ['Pay-per-generation', 'No prepaid balance, no subscription. You pay for exactly the asset you make, at the moment you make it.'],
  ['Live market price', 'Each asset has a fixed USD price; it converts to $PIXAI at the live DexScreener rate (cached ~45s) at generation time.'],
  ['100% burned', 'Every generation payment is burned on-chain — supply only drops.'],
  ['Pay-on-success', 'A payment is only spent once generation succeeds, including all internal sub-steps (e.g. a sprite’s anchor + keyframe passes).'],
]

const SDK_METHODS: [string, string][] = [
  ['new PixAI({ secretKey })', 'Create a client from a Solana secret key (base58 or bytes). Optional baseUrl + rpcUrl.'],
  ['generate3D({ prompt })', 'Auth + pay + generate a 3D model in one call. Returns { modelUrl, formats, thumbnailUrl, … }.'],
  ['signIn()', 'Sign-In with Solana from the keypair (called automatically by generate3D).'],
  ['pay(usd)', 'Pay a USD amount in the instance’s rail ($PIXAI burn or SOL) and return the tx signature.'],
  ['getPrice() · is3DLive()', 'Read live payment config / whether 3D is enabled.'],
  ['marketplace.list() · .get(id)', 'Browse marketplace listings or fetch one.'],
]

const FAQ: [string, string][] = [
  ['Do I need my own API key?', 'No. Generation runs server-side through a shared provider key, so the studio works out of the box. Bringing your own OpenRouter key is supported and stored only in your browser.'],
  ['What does it cost?', 'Each asset has a fixed USD price, charged in $PIXAI at the live rate. Images are inexpensive; 3D is a flat per-model price. Before a token mint is configured, generation is free (sign-in + rate-limit only).'],
  ['What if a generation fails?', 'You are only charged on success. A failed generation keeps your payment valid, so you retry for free until it works.'],
  ['Which engines are supported?', 'Anything that reads PNG sprite sheets + JSON manifests, Spine skeletons, or GLB / FBX / OBJ — including Unity, Godot and Unreal.'],
  ['How does the marketplace pay out?', 'Peer-to-peer. The buyer’s SOL or $PIXAI goes straight to the seller’s wallet on-chain; the server verifies the transfer, then unlocks the downloads. Only models you generated in the studio can be listed.'],
  ['Can I generate from code?', 'Yes — the @pixai/sdk handles Sign-In with Solana and payment for you, then calls the same API the studio uses. See the SDK section above.'],
]

const SDK_EXAMPLE = `import { PixAI } from '@pixai/sdk'

const pixai = new PixAI({
  secretKey: process.env.SOLANA_SECRET_KEY!, // base58 or Uint8Array
})

// Generate a 3D model — Sign-In with Solana + $PIXAI
// payment happen automatically under the hood.
const model = await pixai.generate3D({
  prompt: 'low-poly treasure chest, wooden with iron bands',
})

console.log(model.modelUrl)  // GLB url, ready to download
console.log(model.formats)   // { glb, fbx, obj }`

function Section({ id, title, kicker, children }: { id?: string; title: string; kicker?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-4xl scroll-mt-24 px-5 py-12">
      {kicker && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--text-muted)]">{kicker}</p>}
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="text-[15px] font-semibold">{title}</div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{children}</p>
    </div>
  )
}

export default function Developers() {
  return (
    <main className="mx-light relative min-h-screen bg-[var(--bg)] text-[var(--text)]">
      {/* nav */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(255,255,255,0.8)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-5">
          <a href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoo.png" alt="PIXAI" width={30} height={30} className="h-[30px] w-[30px] object-contain" />
            <span className="text-[16px] font-semibold tracking-tight">PIXAI</span>
            <span className="rounded-full bg-[var(--accent-bg)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--accent)]">Docs</span>
          </a>
          <nav className="hidden items-center gap-5 md:flex">
            {NAV.map(([label, href]) => (
              <a key={href} href={href} className="text-[13px] text-[var(--text-secondary)] transition-colors hover:text-[var(--text)]">{label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn btn-ghost text-[13px]">GitHub</a>
            <a href="/studio" className="btn btn-primary">Launch Studio →</a>
          </div>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-4xl px-5 pb-10 pt-20 text-center">
        <p className="mb-3 font-mono text-[12px] uppercase tracking-widest text-[var(--text-muted)]">Documentation</p>
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl">
          From a prompt to{' '}
          <span className="lp-gradient-text">game-ready art</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-[16px] leading-relaxed text-[var(--text-secondary)]">
          PIXAI turns text into production-ready 2D and 3D game assets — sprites, tilesets,
          parallax, props and low-poly models. Generate in the studio or from code with the SDK,
          trade models on the marketplace, and pay per generation in $PIXAI. Here’s how it all works.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/studio" className="btn btn-primary px-6 py-3 text-[14px]">Open the studio</a>
          <a href="#how" className="btn btn-secondary px-6 py-3 text-[14px]">How it works</a>
          <a href="#sdk" className="btn btn-secondary px-6 py-3 text-[14px]">SDK</a>
        </div>
      </section>

      {/* studios */}
      <Section id="studios" title="The studios" kicker="What it makes">
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          {STUDIOS.map(([name, tag, desc], i) => (
            <div key={name} className={`flex flex-col gap-2 px-5 py-5 sm:flex-row sm:gap-6 ${i % 2 ? 'bg-[var(--bg-elev)]' : 'bg-[var(--surface)]'}`}>
              <div className="shrink-0 sm:w-40">
                <div className="text-[15px] font-semibold">{name}</div>
                <div className="text-[12px] text-[var(--text-muted)]">{tag}</div>
              </div>
              <p className="text-[14px] leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* how it works */}
      <Section id="how" title="How a generation works" kicker="Pipeline">
        <div className="grid gap-4 sm:grid-cols-2">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <div className="font-mono text-[13px] text-[var(--text-muted)]">{n}</div>
              <div className="mt-2 text-[15px] font-semibold">{t}</div>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--text-secondary)]">{d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 max-w-2xl text-[13px] leading-relaxed text-[var(--text-muted)]">
          Behind a single click the engine often fans out into several model calls — a sprite locks
          a character anchor, builds a skeletal pose-map for the requested action, paints the sheet,
          then runs an AI art-director QA pass and re-paints anything off-model. One payment covers
          the whole chain, and it’s only spent when the final result lands.
        </p>
      </Section>

      {/* marketplace */}
      <Section id="marketplace" title="The 3D marketplace" kicker="Trade">
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
          Every model you generate in the 3D studio is yours. List it for sale and other creators
          buy it peer-to-peer — payment goes straight from the buyer’s wallet to yours.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card title="Dual-currency, your choice">Price each listing in <strong>SOL</strong> or <strong>$PIXAI</strong>. The buyer pays in that currency; funds land directly in your wallet (an optional platform fee can route to the treasury).</Card>
          <Card title="Provenance built in">Only models actually generated in the studio can be listed — every listing is a real PIXAI asset, owned by the wallet that made it.</Card>
          <Card title="Gated downloads">Before purchase only the preview thumbnail is public. The GLB / FBX / OBJ and the interactive 3D viewer unlock for the owner and confirmed buyers.</Card>
          <Card title="On-chain verified">The server confirms the buyer’s transfer on-chain before unlocking files, and purchases are idempotent per transaction.</Card>
        </div>
      </Section>

      {/* token */}
      <Section id="token" title="Paying with $PIXAI" kicker="Token">
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
          PIXAI uses direct pay-per-generation. The token is the access layer and a deflation
          engine — every asset generated permanently removes $PIXAI from circulation.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {TOKEN_FACTS.map(([t, d]) => (
            <Card key={t} title={t}>{d}</Card>
          ))}
        </div>
        <p className="mt-6 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Anti-abuse: <span className="text-[var(--text-secondary)]">Sign-In with Solana</span> proves
          wallet ownership before anything is spent, and requests are rate-limited per wallet. The
          server verifies every payment on-chain before it returns an asset.
        </p>
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)] p-5">
          <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">$PIXAI contract</div>
          <div className="mt-2 break-all font-mono text-[13px] text-[var(--text-secondary)]">{TOKEN_CA}</div>
        </div>
      </Section>

      {/* sdk */}
      <Section id="sdk" title="Generate from code — @pixai/sdk" kicker="SDK">
        <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--text-secondary)]">
          A headless TypeScript client for Node. Give it a Solana keypair and it handles Sign-In
          with Solana and the $PIXAI / SOL payment for you, then calls the same API the studio
          uses — so you can generate assets straight from your build pipeline or backend.
        </p>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-elev)]">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <span className="font-mono text-[12px] text-[var(--text-muted)]">npm install @pixai/sdk</span>
            <a href={SDK_URL} target="_blank" rel="noreferrer" className="text-[12px] text-[var(--text-secondary)] underline-offset-2 hover:underline">View on GitHub →</a>
          </div>
          <pre className="overflow-x-auto px-4 py-4 text-[12.5px] leading-relaxed text-[var(--text-secondary)]"><code>{SDK_EXAMPLE}</code></pre>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)]">
          {SDK_METHODS.map(([sig, desc], i) => (
            <div key={sig} className={`flex flex-col gap-1 px-5 py-4 sm:flex-row sm:gap-6 ${i % 2 ? 'bg-[var(--bg-elev)]' : 'bg-[var(--surface)]'}`}>
              <code className="shrink-0 font-mono text-[12.5px] text-[var(--text)] sm:w-72">{sig}</code>
              <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">{desc}</p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-[var(--text-muted)]">
          Use a dedicated funded wallet — SDK generations spend real $PIXAI / SOL, just like the studio.
        </p>
      </Section>

      {/* exports */}
      <Section id="exports" title="Exports & engines" kicker="Output">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ['2D sheets + rigs', 'PNG sprite sheets + JSON manifests with per-frame data, packed tile/prop atlases, and Spine skeletons for animated characters.'],
            ['3D models', 'GLB, FBX and OBJ with textures — orbit-previewed in the browser before you export.'],
            ['Engine-ready', 'Drops straight into Unity, Godot and Unreal — no manual slicing or cleanup.'],
          ].map(([t, d]) => (
            <Card key={t} title={t}>{d}</Card>
          ))}
        </div>
      </Section>

      {/* under the hood */}
      <Section id="tech" title="Under the hood" kicker="Stack">
        <ul className="grid gap-3 sm:grid-cols-2">
          {[
            'Next.js 14 (App Router), React, TypeScript, Tailwind CSS',
            'OpenRouter for 2D image + vision models, Meshy for text-to-3D',
            'Solana — Sign-In with Solana, on-chain $PIXAI burns, native-SOL marketplace',
            'DexScreener live price oracle, RPC payment verification',
          ].map((t) => (
            <li key={t} className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--text-muted)]" />
              {t}
            </li>
          ))}
        </ul>
      </Section>

      {/* faq */}
      <Section id="faq" title="FAQ" kicker="Questions">
        <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)]">
          {FAQ.map(([q, a]) => (
            <div key={q} className="px-5 py-5">
              <div className="text-[15px] font-semibold">{q}</div>
              <p className="mt-2 text-[14px] leading-relaxed text-[var(--text-secondary)]">{a}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* cta */}
      <section className="px-5 py-16">
        <div className="mx-auto max-w-4xl rounded-3xl border border-[var(--border)] bg-[var(--bg-elev)] px-6 py-14 text-center">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Build your game’s art</h2>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-[var(--text-secondary)]">
            Connect a wallet, describe an asset, watch it generate. Pay only for what works.
          </p>
          <a href="/studio" className="btn btn-primary mt-8 px-7 py-3 text-[14px]">Open the studio →</a>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-[var(--border)] px-5 py-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between text-[13px] text-[var(--text-muted)]">
          <a href="/" className="flex items-center gap-2 transition-colors hover:text-[var(--text)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logoo.png" alt="" className="h-5 w-5 object-contain" /> PIXAI
          </a>
          <div className="flex items-center gap-6">
            <a href="/studio" className="transition-colors hover:text-[var(--text)]">Studio</a>
            <a href="/marketplace" className="transition-colors hover:text-[var(--text)]">Marketplace</a>
            <a href={TWITTER_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text)]">Twitter</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text)]">GitHub</a>
          </div>
        </div>
      </footer>
    </main>
  )
}
