'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5 text-2xl">
        ⚠️
      </div>
      <h1 className="text-2xl font-bold tracking-tight mb-2">Something went wrong</h1>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm">
        An unexpected error occurred. You can try again or head back home.
      </p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-80 transition-opacity"
        >
          Try again
        </button>
        <Link
          href="/"
          className="px-5 py-2.5 rounded-full text-sm font-medium bg-secondary text-foreground hover:bg-accent transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
