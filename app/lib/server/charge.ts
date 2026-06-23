import { NextResponse, type NextRequest } from 'next/server'
import { getAuthedAddress } from '@/app/lib/server/auth'
import { rateLimit } from '@/app/lib/server/ratelimit'
import { actionCostCents, centsToUsd, CreditAction, isPaymentLive } from '@/app/lib/credits'
import { checkPayment, spendPayment } from '@/app/lib/server/payments'

export interface Gate {
  ok: true
  address: string
  /** cents this generation costs */
  cost: number
  /** payment that funds it (null before the token launches → free) */
  txSignature: string | null
}

/**
 * Direct pay-per-generation gate. No prepaid balance:
 *   - before the token launches (no mint) → generation is FREE (auth + rate-limit)
 *   - after launch → the request must carry a `txSignature` of a wallet payment
 *     to the treasury that covers this generation's USD price
 *
 *   const gate = await gateRequest(request, 'image', { txSignature })
 *   if ('error' in gate) return gate.error
 *   ... generate ...
 *   await settle(gate)   // spends the payment, only on success
 */
export async function gateRequest(
  request: NextRequest,
  action: CreditAction,
  opts: { txSignature?: unknown; overrideCents?: number } = {}
): Promise<{ error: NextResponse } | Gate> {
  const address = getAuthedAddress(request)
  if (!address) {
    return {
      error: NextResponse.json(
        { error: 'Sign in with your wallet to generate.', code: 'NO_AUTH' },
        { status: 401 }
      ),
    }
  }

  const rl = rateLimit(`gen:${address}`)
  if (!rl.ok) {
    return {
      error: NextResponse.json(
        { error: 'Slow down — too many requests.', code: 'RATE_LIMITED', retryAfter: rl.retryAfter },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      ),
    }
  }

  const cost = opts.overrideCents ?? actionCostCents(action)

  // Free until the token is launched.
  if (!isPaymentLive()) {
    return { ok: true, address, cost, txSignature: null }
  }

  // Paid: require a wallet payment covering this generation.
  const txSignature = typeof opts.txSignature === 'string' ? opts.txSignature : ''
  if (!txSignature) {
    return {
      error: NextResponse.json(
        { error: 'Payment required.', code: 'PAYMENT_REQUIRED', costUsd: centsToUsd(cost) },
        { status: 402 }
      ),
    }
  }
  const pay = await checkPayment(txSignature, address, cost)
  if (!pay.ok) {
    return {
      error: NextResponse.json(
        { error: pay.error, code: pay.code, costUsd: centsToUsd(cost) },
        { status: pay.status ?? 402 }
      ),
    }
  }
  return { ok: true, address, cost, txSignature }
}

/** Spend the payment for a successful generation. No-op while generation is free. */
export async function settle(gate: Gate): Promise<void> {
  if (gate.txSignature) spendPayment(gate.txSignature, gate.cost)
}
