/**
 * Postgres-backed credit ledger — the production backend for creditStore.
 * Activated automatically when DATABASE_URL is set (Supabase / Neon / RDS /
 * any Postgres). Atomic spend via row-level SELECT ... FOR UPDATE, so it is
 * correct across multiple server instances (unlike the file store).
 *
 * Schema is created on first use. Works on Vercel/Supabase out of the box;
 * set PGSSL=disable for a local Postgres without TLS.
 */
import { Pool } from 'pg'
import type { Account, SpendResult } from '@/app/lib/server/creditStore'
import { SIGNUP_BONUS } from '@/app/lib/credits'

let pool: Pool | null = null
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'disable' ? false : { rejectUnauthorized: false },
      max: 5,
    })
  }
  return pool
}

let schemaReady: Promise<void> | null = null
function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS accounts (
           address  text PRIMARY KEY,
           credits  integer NOT NULL DEFAULT 0
         );
         CREATE TABLE IF NOT EXISTS ledger (
           id       bigserial PRIMARY KEY,
           address  text NOT NULL,
           ts       bigint NOT NULL,
           type     text NOT NULL,
           delta    integer NOT NULL,
           balance  integer NOT NULL,
           note     text
         );
         CREATE INDEX IF NOT EXISTS ledger_address_idx ON ledger(address);`
      )
      .then(() => undefined)
      .catch((e) => {
        schemaReady = null
        throw e
      })
  }
  return schemaReady
}

async function history(address: string): Promise<Account['history']> {
  const { rows } = await getPool().query(
    `SELECT ts, type, delta, balance, note FROM ledger WHERE address = $1 ORDER BY id DESC LIMIT 500`,
    [address]
  )
  return rows.map((r) => ({
    ts: Number(r.ts),
    type: r.type,
    delta: r.delta,
    balance: r.balance,
    note: r.note ?? undefined,
  }))
}

export async function getAccount(address: string): Promise<Account> {
  await ensureSchema()
  const addr = address.trim()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const existing = await client.query('SELECT credits FROM accounts WHERE address = $1 FOR UPDATE', [addr])
    if (existing.rowCount === 0) {
      await client.query('INSERT INTO accounts(address, credits) VALUES ($1, $2)', [addr, SIGNUP_BONUS])
      await client.query(
        'INSERT INTO ledger(address, ts, type, delta, balance, note) VALUES ($1,$2,$3,$4,$5,$6)',
        [addr, Date.now(), 'signup', SIGNUP_BONUS, SIGNUP_BONUS, null]
      )
      await client.query('COMMIT')
      return { credits: SIGNUP_BONUS, history: await history(addr) }
    }
    await client.query('COMMIT')
    return { credits: existing.rows[0].credits, history: await history(addr) }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

export async function grant(address: string, amount: number, type: string, note?: string): Promise<number> {
  await ensureSchema()
  const addr = address.trim()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    const up = await client.query(
      `INSERT INTO accounts(address, credits) VALUES ($1, $2)
       ON CONFLICT (address) DO UPDATE SET credits = accounts.credits + $2
       RETURNING credits`,
      [addr, amount]
    )
    const balance = up.rows[0].credits
    await client.query(
      'INSERT INTO ledger(address, ts, type, delta, balance, note) VALUES ($1,$2,$3,$4,$5,$6)',
      [addr, Date.now(), type, amount, balance, note ?? null]
    )
    await client.query('COMMIT')
    return balance
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}

export async function spend(address: string, amount: number, note?: string): Promise<SpendResult> {
  await ensureSchema()
  const addr = address.trim()
  const client = await getPool().connect()
  try {
    await client.query('BEGIN')
    let row = await client.query('SELECT credits FROM accounts WHERE address = $1 FOR UPDATE', [addr])
    if (row.rowCount === 0) {
      await client.query('INSERT INTO accounts(address, credits) VALUES ($1, $2)', [addr, SIGNUP_BONUS])
      await client.query(
        'INSERT INTO ledger(address, ts, type, delta, balance, note) VALUES ($1,$2,$3,$4,$5,$6)',
        [addr, Date.now(), 'signup', SIGNUP_BONUS, SIGNUP_BONUS, null]
      )
      row = { rows: [{ credits: SIGNUP_BONUS }], rowCount: 1 } as typeof row
    }
    const credits = row.rows[0].credits
    if (credits < amount) {
      await client.query('COMMIT')
      return { ok: false, balance: credits }
    }
    const balance = credits - amount
    await client.query('UPDATE accounts SET credits = $2 WHERE address = $1', [addr, balance])
    await client.query(
      'INSERT INTO ledger(address, ts, type, delta, balance, note) VALUES ($1,$2,$3,$4,$5,$6)',
      [addr, Date.now(), 'spend', -amount, balance, note ?? null]
    )
    await client.query('COMMIT')
    return { ok: true, balance }
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {})
    throw e
  } finally {
    client.release()
  }
}
