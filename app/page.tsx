'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import MonoGrid from '@/app/components/ui/MonoGrid'

/* PIXAI — landing page. Monochrome editorial reskin (black & white). */

export default function Home() {
  // per-card cursor spotlight
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const card = (e.target as HTMLElement | null)?.closest('.lp-card') as HTMLElement | null
      if (card) {
        const r = card.getBoundingClientRect()
        card.style.setProperty('--mx', e.clientX - r.left + 'px')
        card.style.setProperty('--my', e.clientY - r.top + 'px')
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // scroll-reveal
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && en.target.classList.add('is-in')),
      { threshold: 0.14 }
    )
    document.querySelectorAll('.lp-reveal').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <main className="mx-light relative min-h-screen overflow-x-hidden bg-[color:var(--bg)] text-[color:var(--text)]">
      <MonoGrid />
      <div className="mx-grain" aria-hidden="true" />
      <div className="relative z-10">
        <Nav />
        <Hero />
        <Marquee />
        <Studios />
        <Pipeline />
        <Token />
        <CTA />
        <Footer />
      </div>
    </main>
  )
}

/* ------------------------------------------------------------------ Nav */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={'mx-nav' + (scrolled ? ' is-scrolled' : '')}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logoo.png" alt="PIXAI" className="h-12 w-12 object-contain" />
          <span className="font-display text-2xl font-semibold lowercase tracking-tight">pixai</span>
        </Link>
        <nav className="hidden items-center gap-8 text-sm md:flex">
          <a className="mx-navlink" href="#studios">Studios</a>
          <a className="mx-navlink" href="#pipeline">Pipeline</a>
          <a className="mx-navlink" href="#token">Token</a>
          <Link className="mx-navlink" href="/developers">Docs</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Social className="hidden sm:flex" />
          <Link href="/studio" className="btn btn-primary">Launch app</Link>
        </div>
      </div>
    </header>
  )
}

/* ----------------------------------------------------------------- Hero */
function Hero() {
  return (
    <section className="mx-hero relative px-6 pt-36 pb-20">
      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-2">
        {/* left — copy */}
        <div>
          <div className="mx-eyebrow lp-reveal">
            <span className="dot" />
            AI game-asset foundry · built on Solana
          </div>

          <h1 className="lp-reveal mt-6 font-display text-[clamp(2.7rem,6vw,5.4rem)] font-bold leading-[0.95] tracking-tight">
            Prompt in.
            <br />
            <span className="lp-gradient-text">Game-ready</span> art out.
          </h1>

          <p className="lp-reveal mt-6 max-w-xl text-[15px] leading-relaxed text-[color:var(--text-secondary)]">
            PIXAI is an AI asset foundry for indie devs — sprites, animations,
            tilesets, parallax backgrounds, props and low-poly 3D, generated and
            packed <span className="text-[color:var(--text)]">export-ready</span> for
            Unity, Godot and Unreal.
          </p>

          <div className="lp-reveal mt-8 flex flex-wrap items-center gap-3">
            <Link href="/studio" className="btn btn-primary px-6 py-3 text-sm">
              Start generating →
            </Link>
            <a href="#pipeline" className="btn btn-secondary px-6 py-3 text-sm">
              See the pipeline
            </a>
          </div>

          <p className="lp-reveal mt-5 text-xs tracking-wide text-[color:var(--text-muted)]">
            Pay per generation in <span className="text-[color:var(--text-secondary)]">$PIXAI</span> · 100% burned on-chain · fail = free retry
          </p>

          <div className="lp-reveal mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-[color:var(--border)] pt-6">
            {[
              ['5', 'studios'],
              ['100%', 'burned'],
              ['~60s', 'per 3D model'],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-2xl font-bold">{n}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* right — contact sheet */}
        <div className="lp-reveal">
          <ContactSheet />
        </div>
      </div>
    </section>
  )
}

/* The hero "examples" — a live contact sheet of what the studio makes. */
function ContactSheet() {
  return (
    <div className="mx-sheet">
      <div className="mx-sheet-bar">
        <span className="rec" />
        generating · contact sheet
        <span className="ml-auto normal-case tracking-normal text-[color:var(--text-muted)]">pixai.studio</span>
      </div>

      <div className="relative overflow-hidden p-3">
        <div className="mx-scan" />
        <div className="grid grid-cols-2 gap-3">
          {/* sprite */}
          <div className="mx-cell">
            <span className="mx-cell-label">sprite · hero</span>
            <span className="mx-cell-no">16-bit</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mx-shot" src="/examples/sprite.png" alt="Generated pixel-art knight" />
          </div>

          {/* tileset */}
          <div className="mx-cell">
            <span className="mx-cell-label">tileset · terrain</span>
            <span className="mx-cell-no">seam ✓</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mx-shot" src="/examples/tileset.png" alt="Generated platform tileset" />
          </div>

          {/* 3d */}
          <div className="mx-cell">
            <span className="mx-cell-label">3d · low-poly</span>
            <span className="mx-cell-no">.glb</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mx-shot" src="/examples/model3d.png" alt="Generated low-poly 3D chest" />
          </div>

          {/* parallax */}
          <div className="mx-cell">
            <span className="mx-cell-label">parallax · forest</span>
            <span className="mx-cell-no">∞ wide</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="mx-shot" src="/examples/parallax.png" alt="Generated parallax background" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[color:var(--border)] px-4 py-3 text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">
        <span className="text-[color:var(--text)]">export ✓</span>
        Unity · Godot · Unreal
        <span className="ml-auto">100% burned</span>
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Marquee */
function Marquee() {
  const words = ['SPRITES', 'TILESETS', 'PARALLAX', 'PROPS', '3D MODELS', 'ANIMATIONS', 'ATLASES']
  const Row = () => (
    <div className="flex items-center gap-10 pr-10">
      {words.map((w) => (
        <span key={w} className="flex items-center gap-10">
          <span className="mx-outline whitespace-nowrap font-display text-4xl font-bold md:text-6xl">{w}</span>
          <span className="text-[color:var(--text-muted)]">·</span>
        </span>
      ))}
    </div>
  )
  return (
    <div className="mx-marquee border-y border-[color:var(--border)] py-6">
      <div className="mx-marquee-track">
        <Row />
        <Row />
      </div>
    </div>
  )
}

/* -------------------------------------------------------------- Studios */
const STUDIOS = [
  {
    n: '01',
    key: 'sprite',
    title: 'Sprite Studio',
    desc: 'Characters and full animation sets from a single prompt. A two-pass engine paints every keyframe onto a consistent pose-map, so the whole sheet stays on-model.',
    meta: ['OpenRouter', 'PNG sheet + atlas'],
  },
  {
    n: '02',
    key: 'tiles',
    title: 'Tileset Studio',
    desc: '13-slice autotile sets generated in one pass, corners reconciled and QA’d by an AI art director — drop straight into your tilemap, no seams.',
    meta: ['Autotile', 'Seamless'],
  },
  {
    n: '03',
    key: 'parallax',
    title: 'Parallax Studio',
    desc: 'Multi-layer scrolling backgrounds, auto-extended to any width and seam-healed for endless side-scrollers.',
    meta: ['Layered', 'Any width'],
  },
  {
    n: '04',
    key: 'props',
    title: 'Prop Studio',
    desc: 'Batches of distinct, deduplicated decoration sprites, packed into one tidy atlas that ships as-is.',
    meta: ['Batch', 'Atlas-packed'],
  },
  {
    n: '05',
    key: '3d',
    title: '3D Studio',
    desc: 'Text to low-poly, textured 3D models in about a minute — exported as GLB, FBX or OBJ for any engine.',
    meta: ['Meshy · PBR', 'GLB / FBX / OBJ'],
  },
]

function Studios() {
  return (
    <section id="studios" className="scroll-mt-24 px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow="The foundry" title="Five studios. One pipeline." sub="Every kind of 2D and 3D asset an indie game needs — each studio purpose-built, all paid the same way." />

        <div className="mt-14 border-t border-[color:var(--border)]">
          {STUDIOS.map((s) => (
            <div
              key={s.key}
              className="mx-studio-row lp-reveal grid items-center gap-6 border-b border-[color:var(--border)] px-2 py-9 md:grid-cols-12"
            >
              <div className="mx-studio-index font-display text-5xl font-bold md:col-span-1">{s.n}</div>
              <div className="md:col-span-5">
                <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[color:var(--text-secondary)]">{s.desc}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {s.meta.map((m) => (
                    <span key={m} className="rounded-full border border-[color:var(--border)] px-3 py-1 text-[11px] uppercase tracking-wider text-[color:var(--text-muted)]">{m}</span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-6">
                <div className="mx-prev aspect-[16/9] w-full">
                  <StudioPreview k={s.key} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const SHOT: Record<string, string> = {
  sprite: '/examples/sprite.png',
  tiles: '/examples/tileset.png',
  parallax: '/examples/parallax.png',
  props: '/examples/props.png',
  '3d': '/examples/model3d.png',
}

function StudioPreview({ k }: { k: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img className="mx-shot mx-shot-contain" src={SHOT[k] ?? SHOT.sprite} alt={`PIXAI generated ${k} asset`} />
  )
}

/* ------------------------------------------------------------- Pipeline */
const STEPS = [
  ['01', 'Connect', 'Connect a Solana wallet and sign in. One signature proves the wallet is yours.'],
  ['02', 'Describe', 'Pick a studio and type what you need. The engine plans the passes for you.'],
  ['03', 'Pay & burn', 'Pay the asset’s exact USD value in $PIXAI — 100% burned on-chain. Generation fails? Free retry.'],
  ['04', 'Export', 'Download engine-ready sheets, atlases and models for Unity, Godot and Unreal.'],
]

function Pipeline() {
  return (
    <section id="pipeline" className="scroll-mt-24 border-t border-[color:var(--border)] px-6 py-28">
      <div className="mx-auto max-w-6xl">
        <SectionHead eyebrow="How it works" title="Prompt to engine in four steps." sub="No prepaid balance, no subscription. You pay for exactly the asset you make, at the moment you make it." />
        <div className="mt-14 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--border)] sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="lp-card lp-reveal flex flex-col bg-[color:var(--bg)] p-7">
              <div className="mx-step-no font-display text-4xl font-bold">{n}</div>
              <h3 className="mt-5 font-display text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- Token */
function Token() {
  const tiles = [
    ['Pay-per-generation', 'No credits, no subscription. You pay for exactly the asset you make, when you make it.'],
    ['100% burned', 'Every token you spend is destroyed on-chain. No treasury, no team cut — supply only drops.'],
    ['Live market price', 'The USD price converts to $PIXAI at the live DexScreener rate, then verified on-chain.'],
  ]
  return (
    <section id="token" className="scroll-mt-24 border-t border-[color:var(--border)] px-6 py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
        {/* burn dial */}
        <div className="lp-reveal flex justify-center">
          <div className="relative grid h-64 w-64 place-content-center">
            <div className="mx-ring absolute inset-0" />
            <div className="mx-flame absolute inset-7 grid place-content-center rounded-full border border-[color:var(--border)] bg-[color:var(--bg-elev)]">
              <div className="text-center">
                <div className="font-display text-6xl font-bold leading-none">100%</div>
                <div className="mt-2 text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)]">burned</div>
              </div>
            </div>
          </div>
        </div>

        {/* copy */}
        <div>
          <SectionHead eyebrow="$PIXAI" title="Spend the token. Watch the supply shrink." sub="The token is the access layer — and a deflation engine. Every asset ever generated permanently removes $PIXAI from circulation." align="left" />
          <div className="mt-8 space-y-px overflow-hidden rounded-[var(--radius-lg)] border border-[color:var(--border)] bg-[color:var(--border)]">
            {tiles.map(([t, d]) => (
              <div key={t} className="lp-card lp-reveal bg-[color:var(--bg)] p-5">
                <h4 className="font-display text-base font-semibold">{t}</h4>
                <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--text-secondary)]">{d}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[13px] text-[color:var(--text-muted)]">
            More games built on PIXAI → more $PIXAI destroyed. Utility-driven deflation, not a one-off event.
          </p>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ CTA */
function CTA() {
  return (
    <section className="relative border-y border-[color:var(--border)] px-6 py-28 text-center">
      <div className="mx-auto max-w-3xl">
        <h2 className="lp-reveal font-display text-[clamp(2.4rem,5.5vw,4.5rem)] font-bold leading-[0.98] tracking-tight">
          Build your game’s art
          <br />
          in an afternoon.
        </h2>
        <p className="lp-reveal mx-auto mt-6 max-w-lg text-[15px] text-[color:var(--text-secondary)]">
          Connect a wallet, describe an asset, watch it generate. Pay only for what works.
        </p>
        <div className="lp-reveal mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/studio" className="btn btn-primary px-7 py-3 text-base">Launch the studio →</Link>
          <Link href="/developers" className="btn btn-secondary px-7 py-3 text-base">Read the docs</Link>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- Footer */
function Footer() {
  return (
    <footer className="px-6 py-16">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logoo.png" alt="PIXAI" className="h-11 w-11 object-contain" />
              <span className="font-display text-xl font-semibold lowercase tracking-tight">pixai</span>
            </div>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[color:var(--text-muted)]">
              An AI game-asset foundry on Solana. Prompt in, game-ready art out —
              paid per generation, 100% burned.
            </p>
            <Social className="mt-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">Product</div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-[color:var(--text-secondary)]">
              <li><Link className="mx-navlink" href="/studio">Studio</Link></li>
              <li><Link className="mx-navlink" href="/studio/3d">3D Studio</Link></li>
              <li><a className="mx-navlink" href="#studios">Studios</a></li>
              <li><a className="mx-navlink" href="#token">Token</a></li>
            </ul>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">Resources</div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-[color:var(--text-secondary)]">
              <li><Link className="mx-navlink" href="/developers">Docs</Link></li>
              <li><a className="mx-navlink" href="#pipeline">How it works</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-[color:var(--border)] pt-6">
          <div className="text-[11px] uppercase tracking-widest text-[color:var(--text-muted)]">$PIXAI contract</div>
          <div className="mx-ca mt-2 text-[color:var(--text-secondary)]">FiRuJdh2qkBwU2XUhHieyiAqQvx6J3HM1fkdkkPkpump</div>
        </div>

        <div className="mt-8 flex flex-col gap-2 text-[12px] text-[color:var(--text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 PIXAI · built on Solana</span>
        </div>
      </div>
    </footer>
  )
}

/* ------------------------------------------------------------- Social */
const TWITTER_URL = 'https://x.com/PixAI_Studio'
const GITHUB_URL = 'https://github.com/U7P4L-IN/PIXai'

function IconX({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function IconGitHub({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.725-1.335-1.725-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.981.108-.763.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.295-.54-1.486.105-3.097 0 0 1.005-.316 3.3 1.209.96-.262 1.98-.392 3-.398 1.02.006 2.04.136 3 .398 2.28-1.525 3.285-1.209 3.285-1.209.645 1.611.24 2.802.12 3.097.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.578-.015 2.846-.015 3.229 0 .315.21.689.825.573C20.565 21.917 24 17.495 24 12.292 24 5.78 18.627.5 12 .5z" />
    </svg>
  )
}

function Social({ className = '' }: { className?: string }) {
  return (
    <div className={'flex items-center gap-2 ' + className}>
      <a href={TWITTER_URL} target="_blank" rel="noreferrer" className="mx-social" aria-label="PIXAI on X" title="X / Twitter">
        <IconX />
      </a>
      <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="mx-social" aria-label="PIXAI on GitHub" title="GitHub">
        <IconGitHub />
      </a>
    </div>
  )
}

/* ----------------------------------------------------------- Primitives */
function SectionHead({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  eyebrow: string
  title: string
  sub?: string
  align?: 'center' | 'left'
}) {
  return (
    <div className={'lp-reveal ' + (align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-xl')}>
      <div className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--text-muted)]">{eyebrow}</div>
      <h2 className="mt-3 font-display text-[clamp(1.9rem,4vw,3rem)] font-bold leading-[1.02] tracking-tight">{title}</h2>
      {sub && <p className={'mt-4 text-[15px] leading-relaxed text-[color:var(--text-secondary)] ' + (align === 'center' ? 'mx-auto max-w-xl' : '')}>{sub}</p>}
    </div>
  )
}

/* Mini-art helpers removed — studios/contact-sheet now show real
   PIXAI-generated assets from /public/examples (see SHOT + ContactSheet). */
