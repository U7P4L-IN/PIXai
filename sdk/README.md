# @pixai/sdk

Generate game assets from code. A headless client for a [PIXAI](https://pixai.studio)
instance — it handles **Sign-In with Solana** and **payment** ($PIXAI token-burn
or native SOL) for you, then calls the same public API the website uses.

> ⚠️ Generation costs real funds on a live instance (paid in $PIXAI / SOL from the
> wallet you give the SDK). Use a dedicated funded wallet.

## Install

```bash
npm install @pixai/sdk
```

Node ≥ 18 (uses global `fetch`).

## Quick start

```ts
import { PixAI } from '@pixai/sdk'

const pixai = new PixAI({
  secretKey: process.env.SOLANA_SECRET_KEY!, // base58 string or Uint8Array
  baseUrl: 'https://pixai.studio',         // optional (default)
  rpcUrl: process.env.SOLANA_RPC_URL,         // optional (default mainnet-beta)
})

// Generate a 3D model — auth + payment happen automatically.
const model = await pixai.generate3D({
  prompt: 'low-poly treasure chest, wooden with iron bands',
  artStyle: 'realistic',
  priceUsd: 3, // pay this much (must cover the instance's 3D price)
})

console.log(model.modelUrl)        // GLB url
console.log(model.formats)         // { glb, fbx, obj }
```

## API

### `new PixAI(options)`
| option      | type                     | default                       |
|-------------|--------------------------|-------------------------------|
| `secretKey` | `string \| Uint8Array`   | — (required)                  |
| `baseUrl`   | `string`                 | `https://pixai.studio`     |
| `rpcUrl`    | `string`                 | mainnet-beta public RPC       |
| `fetch`     | `typeof fetch`           | global `fetch`                |

### `pixai.address`
The wallet's base58 address.

### `await pixai.signIn()`
Proves wallet ownership (SIWS) and stores the session. Called automatically by
`generate3D()`, but you can call it eagerly.

### `await pixai.getPrice()`
Live payment config: `{ symbol, payInSol, mint, treasury, live, burnBps, tokenUsd }`.

### `await pixai.pay(usd)`
Pays `usd` worth from the wallet (token-burn or SOL, per the instance) and
returns the tx signature — or `null` if generation is free. `generate3D()` does
this for you.

### `await pixai.is3DLive()`
Whether 3D generation is enabled on the instance.

### `await pixai.generate3D(input)`
```ts
{
  prompt: string
  artStyle?: 'realistic' | 'sculpture'
  topology?: 'quad' | 'triangle'
  targetPolycount?: number
  priceUsd?: number // default 3
}
```
Returns `{ modelUrl, thumbnailUrl?, formats, mock, taskId?, modelId?, priceUsd?, … }`.

### `pixai.marketplace.list({ q?, sort? })` · `pixai.marketplace.get(id)`
Read marketplace listings / a single listing.

### `await pixai.request(path, init)`
Low-level escape hatch (auth cookie attached). Pass `{ json }` to send a JSON body.

## How it works

1. `signIn()` → `POST /api/auth/nonce` → signs the message with your Keypair →
   `POST /api/auth/verify` → captures the `ig_session` cookie.
2. `pay(usd)` → reads `/api/price`, builds a token-burn or SOL transfer, signs +
   sends it on-chain, returns the signature.
3. The generation call sends that signature; the server verifies the payment and
   returns the asset. A failed generation doesn't spend the payment.

No browser, wallet extension, or server changes required.
