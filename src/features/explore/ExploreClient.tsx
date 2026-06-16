'use client'

import { useState, useEffect, useMemo, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, TrendingUp, Clock, Sparkles } from 'lucide-react'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'
import { CreatorRow } from '@/features/explore/CreatorRow'
import { createClient } from '@/lib/supabase/client'
import { PORTFOLIO_CARD_COLUMNS } from '@/lib/queries'

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'development', label: 'Development' },
  { key: 'design', label: 'Design' },
  { key: '3d', label: '3D' },
  { key: 'video', label: 'Video' },
  { key: 'photography', label: 'Photography' },
  { key: 'writing', label: 'Writing' },
  { key: 'music', label: 'Music' },
] as const

const TABS = [
  { key: 'latest', label: 'Latest', icon: Clock },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'creators', label: 'New Creators', icon: Sparkles },
] as const

type TabKey = typeof TABS[number]['key']

const PAGE_SIZE = 24

interface Creator {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  portfolios: { count: number }[]
}

interface Props {
  locale: string
  initialTab: string
  initialCategory: string | null
  initialQuery: string
  latest: Portfolio[]
  trending: Portfolio[]
  newCreators: Creator[]
}

const gridReveal = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
}
const cardReveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
}

export function ExploreClient({
  locale,
  initialTab,
  initialCategory,
  initialQuery,
  latest,
  trending,
  newCreators,
}: Props) {
  const [tab, setTab] = useState<TabKey>((initialTab as TabKey) || 'latest')
  const [category, setCategory] = useState<string>(initialCategory ?? 'all')
  const [query, setQuery] = useState(initialQuery)

  const [items, setItems] = useState<Portfolio[]>(initialTab === 'trending' ? trending : latest)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const supabase = useMemo(() => createClient(), [])
  const tablistId = useId()

  const searching = query.trim().length > 0
  const showCreators = tab === 'creators' && !searching

  /** Fetch one page of portfolios for the current tab/category/query. */
  const fetchPage = useCallback(
    async (offset: number): Promise<Portfolio[]> => {
      let qb = supabase.from('portfolios').select(PORTFOLIO_CARD_COLUMNS)

      if (searching) {
        // Full-text search over the `fts` generated column (GIN-indexed) — this
        // replaces the unindexed `ilike %x%` full-table scan.
        qb = qb.textSearch('fts', query.trim(), { type: 'websearch', config: 'simple' })
      } else if (category !== 'all') {
        qb = qb.ilike('category', category)
      }

      qb =
        tab === 'trending' && !searching
          ? qb.order('likes', { ascending: false }).order('views', { ascending: false })
          : qb.order('created_at', { ascending: false })

      const { data } = await qb.range(offset, offset + PAGE_SIZE - 1)
      return (data ?? []) as unknown as Portfolio[]
    },
    [supabase, tab, category, query, searching]
  )

  // Refetch first page whenever the tab, category, or (debounced) query changes.
  // The cleanup cancels in-flight timers/results so a fast typist or an unmount
  // never triggers a stale state update (fixes the old debounce memory leak).
  useEffect(() => {
    if (showCreators) return

    let active = true
    const timer = setTimeout(async () => {
      setLoading(true)
      const rows = await fetchPage(0)
      if (!active) return
      setItems(rows)
      setHasMore(rows.length === PAGE_SIZE)
      setLoading(false)
    }, searching ? 300 : 0)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [fetchPage, showCreators, searching])

  const loadMore = async () => {
    if (loadingMore) return
    setLoadingMore(true)
    const rows = await fetchPage(items.length)
    setItems((prev) => [...prev, ...rows])
    setHasMore(rows.length === PAGE_SIZE)
    setLoadingMore(false)
  }

  // Roving-focus arrow-key navigation for the tablist (WAI-ARIA Tabs pattern).
  const onTablistKeyDown = (e: React.KeyboardEvent) => {
    const idx = TABS.findIndex((t) => t.key === tab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      const next = TABS[(idx + dir + TABS.length) % TABS.length]
      setTab(next.key)
      document.getElementById(`${tablistId}-tab-${next.key}`)?.focus()
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-16">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        className="mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">Explore</h1>
        <p className="text-muted-foreground text-lg">Discover the world&apos;s best creative work.</p>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        className="relative mb-10"
      >
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search portfolios"
          placeholder="Search by title, category, or keyword..."
          className="w-full bg-secondary border border-border rounded-2xl pl-11 pr-11 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        )}
        {loading && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        )}
      </motion.div>

      {/* Tabs + Category row */}
      {!searching && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex flex-col gap-4 mb-10"
        >
          {/* Tabs */}
          <div
            role="tablist"
            aria-label="Browse"
            onKeyDown={onTablistKeyDown}
            className="flex items-center gap-1 border-b border-border"
          >
            {TABS.map(({ key, label, icon: Icon }) => {
              const selected = tab === key
              return (
                <button
                  key={key}
                  id={`${tablistId}-tab-${key}`}
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`${tablistId}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md ${
                    selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={14} />
                  {label}
                  {selected && (
                    <motion.div
                      layoutId="tab-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full"
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Category filter — only for portfolio tabs */}
          {tab !== 'creators' && (
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  aria-pressed={category === key}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    category === key
                      ? 'bg-foreground text-background'
                      : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Results */}
      <div id={`${tablistId}-panel`} role="tabpanel">
        <AnimatePresence mode="wait">
          {showCreators ? (
            <motion.div
              key="creators"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-3"
            >
              {newCreators.map((creator, i) => (
                <motion.div
                  key={creator.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
                >
                  <CreatorRow creator={creator} locale={locale} />
                </motion.div>
              ))}
              {newCreators.length === 0 && <EmptyState message="No new creators yet." />}
            </motion.div>
          ) : (
            <motion.div
              key={`${tab}-${category}-${searching}`}
              variants={gridReveal}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {items.map((p) => (
                <motion.div key={p.id} variants={cardReveal}>
                  <PortfolioCard portfolio={p} locale={locale} />
                </motion.div>
              ))}
              {items.length === 0 && !loading && (
                <div className="col-span-full">
                  <EmptyState message={searching ? `No results for "${query}"` : 'Nothing here yet.'} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Load more */}
      {!showCreators && items.length > 0 && hasMore && (
        <div className="flex justify-center mt-12">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-6 py-3 rounded-full text-sm font-medium bg-secondary text-foreground hover:bg-accent transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5 text-2xl">✦</div>
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
