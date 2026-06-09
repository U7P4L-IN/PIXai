import type React from 'react'

// Minimal JSX typing for Google's <model-viewer> web component so we can use
// it in TSX. Loaded at runtime via a module <script> on the 3D studio page.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string
          alt?: string
          poster?: string
          ar?: boolean
          'camera-controls'?: boolean
          'auto-rotate'?: boolean
          'shadow-intensity'?: string | number
          exposure?: string | number
          'environment-image'?: string
          'rotation-per-second'?: string
          'interaction-prompt'?: string
          'camera-orbit'?: string
          loading?: 'auto' | 'lazy' | 'eager'
        },
        HTMLElement
      >
    }
  }
}

export {}
