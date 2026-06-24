import { ed25519 } from '@noble/curves/ed25519'
import bs58 from 'bs58'
const BASE = 'http://localhost:3000'

const priv = ed25519.utils.randomPrivateKey()
const address = bs58.encode(ed25519.getPublicKey(priv))
const { issuedAt, message } = await fetch(`${BASE}/api/auth/nonce`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address }),
}).then((r) => r.json())
const signature = bs58.encode(ed25519.sign(new TextEncoder().encode(message), priv))
const vr = await fetch(`${BASE}/api/auth/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address, issuedAt, signature }),
})
const cookie = vr.headers.get('set-cookie').split(';')[0]

for (let i = 1; i <= 5; i++) {
  const r = await fetch(`${BASE}/api/prop-brief`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
    body: JSON.stringify({ prompt: 'forest', count: 2 }),
  })
  const body = await r.json().catch(() => ({}))
  console.log(`call ${i}: ${r.status} ${body.code || ''}`)
}
