/**
 * Sign-In with Solana (server-only). Proves a client owns a wallet before any
 * credits can be spent or granted — closing the "farm signup credits with
 * random addresses and drain the shared OpenRouter key" hole.
 *
 * Flow:
 *   1. client GET/POST /api/auth/nonce  → { issuedAt, message }
 *   2. wallet signs `message`
 *   3. client POST /api/auth/verify { address, issuedAt, signature }
 *      → server verifies the ed25519 signature, sets an HMAC session cookie
 *   4. generation routes read the wallet from that cookie (never the body)
 *
 * Nonces are STATELESS (issuedAt + HMAC tag, 5-min validity) so this works on
 * serverless / multi-instance with no shared nonce store. Re-signing within the
 * window only re-issues a session to a wallet that already proved ownership —
 * not a vulnerability.
 */
import crypto from 'crypto'
import bs58 from 'bs58'
import { ed25519 } from '@noble/curves/ed25519'
import type { NextRequest } from 'next/server'

const SECRET =
  process.env.SESSION_SECRET || process.env.AUTH_SECRET || 'dev-insecure-secret-change-me'

if (
  process.env.NODE_ENV === 'production' &&
  SECRET === 'dev-insecure-secret-change-me'
) {
  console.warn('[auth] SESSION_SECRET is unset — set it in production!')
}

const NONCE_TTL_MS = 5 * 60 * 1000
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const SESSION_COOKIE = 'ig_session'

function hmac(data: string): string {
  return crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
}

/** A Solana address is a base58-encoded 32-byte ed25519 public key. */
export function isValidPubkey(address: unknown): address is string {
  if (typeof address !== 'string' || address.length < 32 || address.length > 44) return false
  try {
    return bs58.decode(address).length === 32
  } catch {
    return false
  }
}

/** Deterministic message both endpoints reconstruct identically. */
export function buildSignInMessage(address: string, issuedAt: number): string {
  const tag = hmac(`nonce:${address}:${issuedAt}`).slice(0, 16)
  return [
    'PIXAI — Sign in',
    '',
    `Wallet: ${address}`,
    'Sign this message to prove you own this wallet and access your credits.',
    'It is free and does not send a transaction.',
    '',
    `Nonce: ${issuedAt}.${tag}`,
  ].join('\n')
}

export function issueNonce(address: string): { issuedAt: number; message: string } {
  const issuedAt = Date.now()
  return { issuedAt, message: buildSignInMessage(address, issuedAt) }
}

/** Verify the signed nonce; on success return a fresh session token. */
export function verifyAndIssueSession(
  address: string,
  issuedAt: number,
  signatureB58: string
): string | null {
  if (!isValidPubkey(address)) return null
  if (!Number.isFinite(issuedAt)) return null
  const age = Date.now() - issuedAt
  if (age > NONCE_TTL_MS || age < -60_000) return null // expired or clock-skewed future

  const message = buildSignInMessage(address, issuedAt)
  let pub: Uint8Array
  let sig: Uint8Array
  try {
    pub = bs58.decode(address)
    sig = bs58.decode(signatureB58)
  } catch {
    return null
  }
  if (pub.length !== 32 || sig.length !== 64) return null

  let ok = false
  try {
    ok = ed25519.verify(sig, new TextEncoder().encode(message), pub)
  } catch {
    return null
  }
  return ok ? issueSession(address) : null
}

export function issueSession(address: string): string {
  const exp = Date.now() + SESSION_TTL_MS
  const payload = `${address}.${exp}`
  return `${Buffer.from(payload).toString('base64url')}.${hmac(payload)}`
}

/** Returns the wallet address if the session token is valid + unexpired. */
export function verifySession(token: string | undefined): string | null {
  if (!token) return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const b64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  let payload: string
  try {
    payload = Buffer.from(b64, 'base64url').toString()
  } catch {
    return null
  }
  if (hmac(payload) !== sig) return null
  const sep = payload.lastIndexOf('.')
  const address = payload.slice(0, sep)
  const exp = Number(payload.slice(sep + 1))
  if (!address || !Number.isFinite(exp) || Date.now() > exp) return null
  return address
}

/** The authenticated wallet for this request, or null. */
export function getAuthedAddress(request: NextRequest): string | null {
  return verifySession(request.cookies.get(SESSION_COOKIE)?.value)
}
