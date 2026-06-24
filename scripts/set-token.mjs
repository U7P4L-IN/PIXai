#!/usr/bin/env node
/**
 * set-token — flip PIXAI onto the real $PIXAI token in one command.
 *
 * Run this on the server the moment the Token-2022 mint exists. It validates
 * the addresses, writes the NEXT_PUBLIC_* token vars into .env.local, and the
 * app picks them up on the next (re)start — no code change, no redeploy of code.
 *
 *   node scripts/set-token.mjs <MINT> <TREASURY> [network] [usdPrice]
 *
 *   <MINT>      Token-2022 mint address of $PIXAI (base58)
 *   <TREASURY>  wallet that receives token payments for credits (base58)
 *   [network]   solana-mainnet (default) | solana-devnet
 *   [usdPrice]  USD value of one token at launch (default 0.001)
 *
 * Example:
 *   node scripts/set-token.mjs 9xQeWv...Mint Trea5ury...Pubkey solana-mainnet 0.0025
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const ENV_PATH = resolve(process.cwd(), '.env.local')

const [, , mint, treasury, network = 'solana-mainnet', usdPrice = '0.001'] = process.argv

function die(msg) {
  console.error(`\x1b[31m✗ ${msg}\x1b[0m`)
  console.error('\nUsage: node scripts/set-token.mjs <MINT> <TREASURY> [network] [usdPrice]')
  process.exit(1)
}

if (!mint || !treasury) die('MINT and TREASURY are required.')
if (!BASE58.test(mint)) die(`MINT "${mint}" is not a valid base58 address.`)
if (!BASE58.test(treasury)) die(`TREASURY "${treasury}" is not a valid base58 address.`)
if (!['solana-mainnet', 'solana-devnet'].includes(network))
  die(`network must be solana-mainnet or solana-devnet (got "${network}").`)
if (Number.isNaN(Number(usdPrice)) || Number(usdPrice) <= 0) die(`usdPrice must be a positive number.`)

const vars = {
  NEXT_PUBLIC_TOKEN_MINT: mint,
  NEXT_PUBLIC_TOKEN_TREASURY: treasury,
  NEXT_PUBLIC_SOLANA_NETWORK: network,
  NEXT_PUBLIC_TOKEN_USD_PRICE: String(usdPrice),
}

// Upsert each var into .env.local, preserving everything else (e.g. keys).
let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : ''
for (const [k, v] of Object.entries(vars)) {
  const line = `${k}=${v}`
  const re = new RegExp(`^${k}=.*$`, 'm')
  env = re.test(env) ? env.replace(re, line) : (env.replace(/\s*$/, '') + `\n${line}`)
}
writeFileSync(ENV_PATH, env.replace(/^\n/, '') + '\n')

console.log('\x1b[32m✓ $PIXAI token wired.\x1b[0m')
console.log(`  mint      ${mint}`)
console.log(`  treasury  ${treasury}`)
console.log(`  network   ${network}  (Token-2022, 6 decimals)`)
console.log(`  price     $${usdPrice} / token`)
console.log('\nRestart the server to apply:  npm run build && npm run start   (or restart `npm run dev`)')
