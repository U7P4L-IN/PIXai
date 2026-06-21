'use client'

import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaDevnet } from '@reown/appkit/networks'
import { REOWN_PROJECT_ID } from '@/app/lib/credits'
import { CreditProvider } from '@/app/components/CreditProvider'

/**
 * Reown AppKit (wallet connect) + credit context. AppKit is initialised once
 * at module load on the client; the guard keeps it from touching `window`
 * during SSR.
 */
const solanaAdapter = new SolanaAdapter()

// Must run on both server and client (before any AppKit hook renders during
// SSR). AppKit is SSR-safe; we avoid referencing `window` directly here.
const appUrl =
  typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'

createAppKit({
  adapters: [solanaAdapter],
  networks: [solana, solanaDevnet],
  projectId: REOWN_PROJECT_ID,
  metadata: {
    name: 'PIXAI',
    description: 'AI Game Asset Studio on Solana',
    url: appUrl,
    icons: [`${appUrl}/logo.png`],
  },
  features: { analytics: false, email: false, socials: [] },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#5fd35f',
    '--w3m-border-radius-master': '2px',
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return <CreditProvider>{children}</CreditProvider>
}
