'use client'

import { useAppKit } from '@reown/appkit/react'
import { useCredits } from '@/app/components/CreditProvider'

function shortAddr(a?: string) {
  if (!a) return ''
  return `${a.slice(0, 4)}…${a.slice(-4)}`
}

/** Top-bar wallet widget. Pay-per-generation — no balance to show. */
export function CreditWallet() {
  const { open } = useAppKit()
  const { isConnected, address, authed, signingIn } = useCredits()

  if (!isConnected) {
    return (
      <button className="btn btn-primary" onClick={() => open()}>
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {!authed && (
        <span className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)]">
          {signingIn ? 'Signing in…' : 'Sign in'}
        </span>
      )}
      <button
        className="btn btn-ghost font-mono text-[12px]"
        onClick={() => open({ view: 'Account' })}
        title="Wallet account"
      >
        {shortAddr(address)}
      </button>
    </div>
  )
}
