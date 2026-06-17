'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

// Catches errors thrown in the root layout itself (where the regular
// [locale]/error.tsx boundary can't reach). Must render its own <html>/<body>.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('global_error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          gap: '1rem',
          padding: '1.5rem',
          textAlign: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ color: '#666', margin: 0 }}>
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          style={{
            padding: '0.625rem 1.25rem',
            borderRadius: '9999px',
            border: 'none',
            background: '#111',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
