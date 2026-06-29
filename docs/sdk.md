# @pixai/sdk

Generate PIXAI game assets **from code**. A headless TypeScript client for Node —
give it a Solana keypair and it handles **Sign-In with Solana** and the
**$PIXAI / SOL payment** for you, then calls the same public API the studio uses.
No browser, no wallet extension, no server changes.

- Repo: [`/sdk`](https://github.com/U7P4L-IN/PIXai/tree/main/sdk)
- Default instance: `https://pixai.studio`

> ⚠️ On a live instance, every generation spends real funds (paid in $PIXAI or
> SOL from the wallet you give the SDK). Use a dedicated, funded wallet.

---

## Install

```bash
npm install @pixai/sdk
```

Requires Node ≥ 18 (uses global `fetch`).

## Quick start

```ts
import { PixAI } from '@pixai/sdk'

const pixai = new PixAI({
  secretKey: process.env.SOLANA_SECRET_KEY!, // base58 string or Uint8Array
  // baseUrl: 'https://pixai.studio',         // optional (default)
  // rpcUrl:  process.env.SOLANA_RPC_URL,     // optional (default mainnet-beta)
})

// Auth + payment happen automatically.
const model = await pixai.generate3D({
  prompt: 'low-poly treasure chest, wooden with iron bands',
  artStyle: 'realistic',
})

console.log(model.modelUrl) // GLB url
console.log(model.formats)  // { glb, fbx, obj }
```

---

## How it works

1. **`signIn()`** → `POST /api/auth/nonce` → signs the returned message with your
   keypair (ed25519) → `POST /api/auth/verify` → captures the `ig_session`
   cookie. Stateless, no transaction.
2. **`pay(usd)`** → reads `/api/price`, builds a **$PIXAI token-burn** or a
   **native SOL** transfer (whatever the instance is configured for), signs and
   sends it on-chain, returns the signature.
3. The generation call sends that signature; the server verifies the payment
   on-chain, runs the generation, and returns the asset. **A failed generation
   does not spend the payment** — retry for free.

---

## API

### `new PixAI(options)`

| option      | type                   | default                    |
|-------------|------------------------|----------------------------|
| `secretKey` | `string \| Uint8Array` | — (required)               |
| `baseUrl`   | `string`               | `https://pixai.studio`     |
| `rpcUrl`    | `string`               | mainnet-beta public RPC    |
| `fetch`     | `typeof fetch`         | global `fetch`             |

### `pixai.address: string`
The wallet's base58 address (derived from the secret key).

### `await pixai.signIn(): Promise<void>`
Proves wallet ownership (SIWS) and stores the session. Called automatically by
`generate3D()`; call it eagerly if you want to fail fast on a bad key.

### `await pixai.getPrice(): Promise<PriceInfo>`
Live payment config:
```ts
{ symbol, payInSol, mint, treasury, network, live, burnBps, tokenUsd }
```

### `await pixai.is3DLive(): Promise<boolean>`
Whether 3D generation is enabled on the instance.

### `await pixai.pay(usd: number): Promise<string | null>`
Pays `usd` worth from the wallet in the instance's rail and returns the tx
signature — or `null` if generation is free (no payment configured). Sends and
confirms on-chain. `generate3D()` calls this for you.

### `await pixai.generate3D(input): Promise<Model3DResult>`
```ts
input: {
  prompt: string
  artStyle?: 'realistic' | 'sculpture'
  topology?: 'quad' | 'triangle'
  targetPolycount?: number
  priceUsd?: number // USD budget to pay; default 3 (must cover the instance price)
}

// returns
{
  modelUrl: string
  thumbnailUrl?: string
  formats: { glb?: string; fbx?: string; obj?: string }
  mock: boolean
  taskId?: string
  modelId?: string
  priceUsd?: number
  priceTokens?: number | null
  tokenUsd?: number
}
```

### `pixai.marketplace.list({ q?, sort? })` · `pixai.marketplace.get(id)`
Read marketplace listings, or fetch a single listing.

### `await pixai.request(path, init)`
Low-level escape hatch — the auth cookie is attached automatically. Pass
`{ json }` to send a JSON body:
```ts
const res = await pixai.request('/api/price')
const data = await res.json()
```

---

## Examples

**Generate a model and save the GLB:**
```ts
import { writeFile } from 'node:fs/promises'

const model = await pixai.generate3D({ prompt: 'stylized health potion bottle' })
const glb = await fetch(model.formats.glb!).then((r) => r.arrayBuffer())
await writeFile('potion.glb', Buffer.from(glb))
```

**Browse the marketplace:**
```ts
const { listings } = await pixai.marketplace.list({ sort: 'new' })
for (const l of listings) console.log(l.title, l.price, l.currency)
```

**Check price / pay manually:**
```ts
const price = await pixai.getPrice()       // { symbol: 'PIXAI', tokenUsd, ... }
const sig = await pixai.pay(3)             // burn $3 of $PIXAI, returns tx sig
```

---

## Notes

- Generation is **free** on an instance where no token mint is configured
  (`pay()` returns `null`); paid once a mint is set.
- `priceUsd` must cover the instance's price (3D is a flat per-model price). Pay
  exactly that — overpay is wasted burn.
- The SDK is a standalone package under [`/sdk`](https://github.com/U7P4L-IN/PIXai/tree/main/sdk);
  it makes no server changes and talks only to the public API.
