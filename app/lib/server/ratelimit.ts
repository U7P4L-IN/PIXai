/**
 * Tiny fixed-window rate limiter (in-memory). Backstops infra abuse — a script
 * hammering the generation routes — on top of auth + finite credits.
 *
 * In-memory = per-instance. Fine for a single server / localhost; swap the Map
 * for Redis/Upstash when you run multiple instances. Tunable via env.
 */
const WINDOW_MS = 60_000
const DEFAULT_MAX = Number(process.env.RATE_LIMIT_PER_MIN || 120)

const hits = new Map<string, { count: number; resetAt: number }>()

export function rateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = WINDOW_MS
): { ok: boolean; retryAfter: number; remaining: number } {
  const now = Date.now()
  const e = hits.get(key)
  if (!e || now > e.resetAt) {
    hits.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, retryAfter: 0, remaining: max - 1 }
  }
  if (e.count >= max) {
    return { ok: false, retryAfter: Math.ceil((e.resetAt - now) / 1000), remaining: 0 }
  }
  e.count++
  return { ok: true, retryAfter: 0, remaining: max - e.count }
}

// Opportunistic cleanup so the Map can't grow unbounded.
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now()
    hits.forEach((v, k) => {
      if (now > v.resetAt) hits.delete(k)
    })
  }, 5 * WINDOW_MS).unref?.()
}
