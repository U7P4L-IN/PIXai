'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react'
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react'
import bs58 from 'bs58'
import { payTokens, paySol, payTokenTransfer, type WalletSender } from '@/app/lib/pay'
import { feeShares, solToLamports, TOKEN, type MarketCurrency } from '@/app/lib/credits'

/**
 * Wallet auth (Sign-In with Solana). No prepaid balance — generation is free
 * until the token launches, then paid per-generation directly from the wallet
 * (see usePayForGeneration). This provider only handles proving wallet ownership
 * so the server can rate-limit and attribute requests.
 */
interface AuthContextValue {
  address?: string
  isConnected: boolean
  /** True once the wallet has proven ownership via a signed message. */
  authed: boolean
  signingIn: boolean
  /** True once payment is configured (generation becomes paid). */
  tokenLive: boolean
  /** Payment unit symbol — 'SOL' or 'PIXAI'. */
  paySymbol: string
  signIn: () => Promise<void>
  refresh: () => Promise<void>
  /**
   * Pay for a generation of `usd` value from the wallet. Returns the payment
   * txSignature, or null when generation is still free (token not launched).
   */
  pay: (usd: number) => Promise<string | null>
  /**
   * Buy a marketplace model: pay the seller (and optional platform fee to the
   * treasury) in the listing's currency — native SOL or the $PIXAI token.
   * Returns the payment txSignature.
   */
  buyAsset: (opts: {
    currency: MarketCurrency
    seller: string
    price: number
    feeBps?: number
    treasury?: string
  }) => Promise<string>
}

const AuthContext = createContext<AuthContextValue>({
  isConnected: false,
  authed: false,
  signingIn: false,
  tokenLive: false,
  paySymbol: 'PIXAI',
  signIn: async () => {},
  refresh: async () => {},
  pay: async () => null,
  buyAsset: async () => '',
})

export const useCredits = () => useContext(AuthContext)

type SolanaSigner = {
  signMessage?: (message: Uint8Array) => Promise<Uint8Array | { signature: Uint8Array }>
} & Partial<WalletSender>

export function CreditProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAppKitAccount()
  const { walletProvider } = useAppKitProvider<SolanaSigner>('solana')
  const { connection } = useAppKitConnection()
  const [authed, setAuthed] = useState(false)
  const [signingIn, setSigningIn] = useState(false)
  const [tokenLive, setTokenLive] = useState(false)
  const [paySymbol, setPaySymbol] = useState('PIXAI')
  const signedFor = useRef<string | null>(null)

  useEffect(() => {
    fetch('/api/price')
      .then((r) => r.json())
      .then((d) => {
        setTokenLive(Boolean(d.live))
        if (d.symbol) setPaySymbol(d.symbol)
      })
      .catch(() => setTokenLive(false))
  }, [])

  /** Pay for a generation; null when still free (token not launched). */
  const pay = useCallback(
    async (usd: number): Promise<string | null> => {
      const p = await fetch('/api/price').then((r) => r.json())
      if (!p.live || !p.tokenUsd) return null // free
      if (!p.payInSol && !p.mint) return null
      if (p.payInSol && !p.treasury) return null
      // Treasury only needed when some of the payment isn't burned.
      if (!p.payInSol && (p.burnBps ?? 0) < 10000 && !p.treasury) return null
      if (!address || !walletProvider?.sendTransaction || !connection) {
        throw new Error('Wallet not ready — reconnect and try again.')
      }
      return payTokens({
        walletProvider: walletProvider as WalletSender,
        connection,
        payer: address,
        mint: p.mint ?? '',
        treasury: p.treasury ?? '', // unused at 100% burn
        amountTokens: (usd * 1.03) / p.tokenUsd, // +3% buffer for rounding/price drift
        burnBps: p.burnBps ?? 0,
        payInSol: Boolean(p.payInSol),
      })
    },
    [address, walletProvider, connection]
  )

  /** Buy a marketplace model: funds straight to the seller (+ optional fee). */
  const buyAsset = useCallback(
    async (opts: {
      currency: MarketCurrency
      seller: string
      price: number
      feeBps?: number
      treasury?: string
    }): Promise<string> => {
      if (!address || !walletProvider?.sendTransaction || !connection) {
        throw new Error('Wallet not ready — reconnect and try again.')
      }
      const { fee, seller } = feeShares(opts.price, opts.feeBps ?? 0)
      const provider = walletProvider as WalletSender

      if (opts.currency === 'token') {
        if (!TOKEN.MINT) throw new Error('Token payments are not configured.')
        const transfers = [{ to: opts.seller, amountTokens: seller }]
        if (fee > 0 && opts.treasury) transfers.push({ to: opts.treasury, amountTokens: fee })
        return payTokenTransfer({ walletProvider: provider, connection, payer: address, mint: TOKEN.MINT, transfers })
      }

      // native SOL
      const transfers = [{ to: opts.seller, lamports: solToLamports(seller) }]
      if (fee > 0 && opts.treasury) transfers.push({ to: opts.treasury, lamports: solToLamports(fee) })
      return paySol({ walletProvider: provider, connection, payer: address, transfers })
    },
    [address, walletProvider, connection]
  )

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/auth/me')
      const d = await r.json()
      setAuthed(Boolean(d.address && d.address === address))
    } catch {
      /* keep last known */
    }
  }, [address])

  const signIn = useCallback(async () => {
    if (!address || !walletProvider?.signMessage) return
    setSigningIn(true)
    try {
      const { issuedAt, message } = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      }).then((r) => r.json())
      if (!message) return
      const signed = await walletProvider.signMessage(new TextEncoder().encode(message))
      const sigBytes = signed instanceof Uint8Array ? signed : signed.signature
      const signature = bs58.encode(sigBytes)
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, issuedAt, signature }),
      })
      if (res.ok) setAuthed(true)
    } catch {
      /* user rejected — stays unauthed, can retry */
    } finally {
      setSigningIn(false)
    }
  }, [address, walletProvider])

  // On connect: check session, auto-prompt sign-in once per address.
  useEffect(() => {
    if (!address) {
      setAuthed(false)
      signedFor.current = null
      return
    }
    let cancelled = false
    ;(async () => {
      await refresh()
      if (cancelled || signedFor.current === address) return
      signedFor.current = address
      const me = await fetch('/api/auth/me').then((r) => r.json()).catch(() => ({}))
      if (!cancelled && me.address !== address) await signIn()
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address])

  return (
    <AuthContext.Provider
      value={{ address, isConnected, authed, signingIn, tokenLive, paySymbol, signIn, refresh, pay, buyAsset }}
    >
      {children}
    </AuthContext.Provider>
  )
}
