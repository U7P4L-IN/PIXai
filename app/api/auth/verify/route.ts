import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifyAndIssueSession } from '@/app/lib/server/auth'
import { getAccount } from '@/app/lib/server/creditStore'

/**
 * POST /api/auth/verify { address, issuedAt, signature } → sets session cookie.
 * The signup bonus is granted here (getAccount) — only AFTER ownership is
 * proven, so it can't be farmed with throwaway addresses.
 */
export async function POST(request: NextRequest) {
  const { address, issuedAt, signature } = await request.json().catch(() => ({}))

  const session = verifyAndIssueSession(address, Number(issuedAt), signature)
  if (!session) {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 })
  }

  const acc = await getAccount(address)
  const res = NextResponse.json({ ok: true, address, credits: acc.credits })
  res.cookies.set(SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
