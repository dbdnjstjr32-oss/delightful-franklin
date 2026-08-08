'use client'

import { Search, X } from 'lucide-react'

export function SearchBar({
  query,
  onChange,
  loading,
}: {
  query: string
  onChange: (value: string) => void
  loading: boolean
}) {
  return (
    <div className="relative border-b border-border">
      <Search
        size={20}
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-muted-foreground"
      />
      <input
        type="search"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search portfolios"
        placeholder="Search by title, category, or keyword…"
        className="w-full appearance-none bg-transparent py-5 pr-20 pl-9 font-display text-xl tracking-tightest text-foreground placeholder:text-muted-foreground/70 focus:outline-none sm:text-2xl [&::-webkit-search-cancel-button]:hidden"
      />

      {loading && (
        <span
          aria-hidden
          className="absolute top-1/2 right-12 size-4 -translate-y-1/2 animate-spin rounded-full border-2 border-primary border-t-transparent"
        />
      )}

      {query && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-0 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  )
}
