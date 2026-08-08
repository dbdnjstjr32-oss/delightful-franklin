'use client'

import { motion } from 'framer-motion'
import { Clock, TrendingUp, Sparkles, SlidersHorizontal } from 'lucide-react'
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

export const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'development', label: 'Development' },
  { key: 'design', label: 'Design' },
  { key: '3d', label: '3D' },
  { key: 'video', label: 'Video' },
  { key: 'photography', label: 'Photography' },
  { key: 'writing', label: 'Writing' },
  { key: 'music', label: 'Music' },
] as const

export const TABS = [
  { key: 'latest', label: 'Latest', icon: Clock },
  { key: 'trending', label: 'Trending', icon: TrendingUp },
  { key: 'creators', label: 'New Creators', icon: Sparkles },
] as const

export type TabKey = (typeof TABS)[number]['key']

type Props = {
  tab: TabKey
  onTabChange: (tab: TabKey) => void
  category: string
  onCategoryChange: (category: string) => void
  tablistId: string
}

export function FilterBar({ tab, onTabChange, category, onCategoryChange, tablistId }: Props) {
  // Roving-focus arrow-key navigation for the tablist (WAI-ARIA Tabs pattern).
  function onTablistKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const index = TABS.findIndex((t) => t.key === tab)
    const direction = e.key === 'ArrowRight' ? 1 : -1
    const next = TABS[(index + direction + TABS.length) % TABS.length]
    onTabChange(next.key)
    document.getElementById(`${tablistId}-tab-${next.key}`)?.focus()
  }

  const activeCategory = CATEGORIES.find((c) => c.key === category)

  return (
    <div className="flex flex-col gap-5">
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
              onClick={() => onTabChange(key)}
              className={`relative flex items-center gap-1.5 rounded-t-md px-4 py-3 text-sm font-medium transition-colors ${
                selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} aria-hidden />
              {label}
              {selected && (
                <motion.span
                  layoutId="explore-tab-underline"
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          )
        })}
      </div>

      {tab !== 'creators' && (
        <>
          {/* Desktop: the full category row. */}
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onCategoryChange(key)}
                aria-pressed={category === key}
                className={`rounded-full px-4 py-2 text-xs font-medium transition-colors ${
                  category === key
                    ? 'bg-foreground text-background'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Mobile: eight pills would wrap into three rows, so they move into
              a sheet behind a single control. */}
          <Sheet>
            <SheetTrigger className="flex h-11 items-center justify-between gap-2 rounded-full border border-border px-4 text-sm font-medium text-foreground sm:hidden">
              <span className="flex items-center gap-2">
                <SlidersHorizontal size={15} aria-hidden />
                Category
              </span>
              <span className="text-muted-foreground">{activeCategory?.label ?? 'All'}</span>
            </SheetTrigger>
            <SheetContent side="bottom" className="max-h-[70vh] rounded-t-xl">
              <SheetHeader>
                <SheetTitle className="font-display tracking-tightest">Category</SheetTitle>
              </SheetHeader>
              <div className="flex flex-wrap gap-2 px-4 pb-8">
                {CATEGORIES.map(({ key, label }) => (
                  <SheetClose
                    key={key}
                    render={<button type="button" />}
                    onClick={() => onCategoryChange(key)}
                    aria-pressed={category === key}
                    className={`rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${
                      category === key
                        ? 'bg-foreground text-background'
                        : 'bg-secondary text-muted-foreground'
                    }`}
                  >
                    {label}
                  </SheetClose>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  )
}
