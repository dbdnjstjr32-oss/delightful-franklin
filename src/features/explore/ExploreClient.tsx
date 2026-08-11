'use client'

import { useState, useEffect, useMemo, useCallback, useId } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'
import { MasonryGrid } from '@/components/portfolio/MasonryGrid'
import { CreatorRow } from '@/features/explore/CreatorRow'
import { SearchBar } from '@/features/explore/SearchBar'
import { FilterBar, type TabKey } from '@/features/explore/FilterBar'
import { ExploreSkeleton } from '@/features/explore/ExploreSkeleton'
import { createClient } from '@/lib/supabase/client'
import { PORTFOLIO_CARD_COLUMNS, PUBLISHED } from '@/lib/queries'
import { useReveal } from '@/lib/motion'

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
  const reveal = useReveal()

  const searching = query.trim().length > 0
  const showCreators = tab === 'creators' && !searching

  /** Fetch one page of portfolios for the current tab/category/query. */
  const fetchPage = useCallback(
    async (offset: number): Promise<Portfolio[]> => {
      let qb = supabase
        .from('portfolios')
        .select(PORTFOLIO_CARD_COLUMNS)
        .eq('status', PUBLISHED)

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

  const showSkeleton = loading && items.length === 0

  return (
    <div className="mx-auto max-w-[110rem] px-5 pt-28 pb-24 sm:px-8">
      <header className="mb-10">
        <p className="overline text-muted-foreground">Browse</p>
        <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tightest sm:text-7xl">
          Explore
        </h1>
      </header>

      <div className="mb-8">
        <SearchBar query={query} onChange={setQuery} loading={loading} />
      </div>

      {!searching && (
        <div className="mb-10">
          <FilterBar
            tab={tab}
            onTabChange={setTab}
            category={category}
            onCategoryChange={setCategory}
            tablistId={tablistId}
          />
        </div>
      )}

      <div id={`${tablistId}-panel`} role="tabpanel">
        <AnimatePresence mode="wait">
          {showCreators ? (
            <motion.ul
              key="creators"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="divide-y divide-border border-y border-border"
            >
              {newCreators.map((creator, i) => (
                <motion.li key={creator.id} {...reveal(i)}>
                  <CreatorRow creator={creator} locale={locale} />
                </motion.li>
              ))}
              {newCreators.length === 0 && (
                <li>
                  <EmptyState
                    title="No creators yet"
                    message="New accounts show up here as soon as they publish."
                  />
                </li>
              )}
            </motion.ul>
          ) : showSkeleton ? (
            <ExploreSkeleton key="skeleton" />
          ) : (
            <motion.div
              key={`${tab}-${category}-${searching}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <MasonryGrid>
                {items.map((p, i) => (
                  <motion.div key={p.id} {...reveal(i % 12)}>
                    <PortfolioCard portfolio={p} locale={locale} priority={i < 3} />
                  </motion.div>
                ))}
              </MasonryGrid>

              {items.length === 0 && !loading && (
                <EmptyState
                  title={searching ? 'Nothing matched' : 'Nothing here yet'}
                  message={
                    searching
                      ? `No work matches “${query}”. Try a broader keyword.`
                      : 'Be the first to publish in this category.'
                  }
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showCreators && items.length > 0 && hasMore && (
        <div className="mt-16 flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-full border border-border px-8 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center border-y border-dashed border-border py-28 text-center">
      <p className="font-display text-3xl font-bold tracking-tightest text-foreground">{title}</p>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
