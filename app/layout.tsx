import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { Providers } from '@/app/components/Providers'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Modern grotesk display font for the PIXAI wordmark / headlines.
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'PIXAI — AI Game Asset Studio on Solana',
  description:
    'Generate production-ready 2D sprites, animations, tilesets, parallax backgrounds and 3D models in minutes. Export to Unity, Godot & Unreal. Powered by $PIXAI on Solana.',
  icons: { icon: '/logo.png' },
  openGraph: {
    title: 'PIXAI — AI Game Asset Studio',
    description:
      'Production-ready 2D & 3D game assets, generated in under 60 seconds.',
    images: ['/logo.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
