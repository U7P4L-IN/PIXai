import { ed25519 } from '@noble/curves/ed25519'
import bs58 from 'bs58'

const BASE = 'http://localhost:3000'
const j = (r) => r.json()

// 1) make a wallet
const priv = ed25519.utils.randomPrivateKey()
const pub = ed25519.getPublicKey(priv)
const address = bs58.encode(pub)
console.log('wallet:', address)

// 2) nonce
const { issuedAt, message } = await fetch(`${BASE}/api/auth/nonce`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address }),
}).then(j)
console.log('nonce issuedAt:', issuedAt)

// 3) sign + verify (capture cookie)
const sig = bs58.encode(ed25519.sign(new TextEncoder().encode(message), priv))
const vr = await fetch(`${BASE}/api/auth/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address, issuedAt, signature: sig }),
})
const cookie = vr.headers.get('set-cookie')?.split(';')[0]
console.log('verify:', vr.status, await vr.json(), '\ncookie:', cookie ? 'set' : 'MISSING')

// 4) /me with cookie
const me = await fetch(`${BASE}/api/auth/me`, { headers: { cookie } }).then(j)
console.log('me (authed):', me)

// 5) brief WITH session (expect 200, not 401)
const okGen = await fetch(`${BASE}/api/prop-brief`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', cookie },
  body: JSON.stringify({ prompt: 'forest biome', count: 3 }),
})
console.log('prop-brief WITH session:', okGen.status)

// 6) brief WITHOUT session (expect 401 NO_AUTH)
const noAuth = await fetch(`${BASE}/api/prop-brief`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: 'forest biome', count: 3 }),
})
console.log('prop-brief NO session:', noAuth.status, (await noAuth.json()).code)

// 7) forged signature (random) must fail verify
const forged = bs58.encode(ed25519.sign(new TextEncoder().encode(message), ed25519.utils.randomPrivateKey()))
const bad = await fetch(`${BASE}/api/auth/verify`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ address, issuedAt, signature: forged }),
})
console.log('forged-signature verify (expect 401):', bad.status)
