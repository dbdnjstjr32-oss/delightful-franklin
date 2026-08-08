'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { logger } from '@/lib/logger'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('route_error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[110rem] flex-col justify-center px-5 pt-24 sm:px-8">
      <p className="overline text-muted-foreground">Something broke</p>
      <h1 className="mt-6 font-display text-6xl font-extrabold tracking-tightest text-foreground sm:text-8xl">
        We hit an
        <br />
        <span className="text-muted-foreground">unexpected error.</span>
      </h1>
      <p className="mt-8 max-w-md text-base leading-relaxed text-muted-foreground">
        Nothing you did caused this. Try again, or head back and take another route.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-xs text-muted-foreground/70">
          Reference: {error.digest}
        </p>
      )}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-85"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
