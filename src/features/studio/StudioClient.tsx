'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  Check,
  Eye,
  Heart,
  LayoutGrid,
  Link2,
  List,
  Paperclip,
  Pencil,
  Plus,
  Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { CATEGORIES } from '@/lib/categories'
import { DeletePortfolioButton } from '@/features/portfolio/components/DeletePortfolioButton'
import { StatusToggle } from './StatusToggle'
import type { SortKey, StatusFilter, StudioWork } from './types'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'sort_newest' },
  { key: 'oldest', label: 'sort_oldest' },
  { key: 'views', label: 'sort_views' },
  { key: 'likes', label: 'sort_likes' },
  { key: 'title', label: 'sort_title' },
]

const STATUSES: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'filter_all' },
  { key: 'published', label: 'filter_published' },
  { key: 'draft', label: 'filter_drafts' },
]

const selectClass =
  'h-11 rounded-full border border-border bg-background px-4 text-sm text-foreground'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-border pl-4">
      <p className="overline text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tightest tabular-nums">
        {value}
      </p>
    </div>
  )
}

/** Copy the public URL without leaving the studio. Origin is read at click time
 *  so preview, staging and production each copy their own link. */
function CopyLink({ href, compact = false }: { href: string; compact?: boolean }) {
  const t = useTranslations('studio')
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${href}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard access is refused on insecure origins and by some browsers.
      toast.error(t('copy_failed'))
    }
  }

  const Icon = copied ? Check : Link2

  if (compact) {
    return (
      <button
        type="button"
        onClick={copy}
        aria-label={t('copy_link_aria')}
        className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <Icon size={16} aria-hidden />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <Icon size={13} aria-hidden />
      {copied ? t('copied') : t('copy_link')}
    </button>
  )
}

/** `onImage` sits over a cover, where the outlined draft treatment disappeared
 *  against a dark photo — it needs its own opaque ground. */
function StatusBadge({
  status,
  onImage = false,
}: {
  status: StudioWork['status']
  onImage?: boolean
}) {
  const t = useTranslations('studio')

  return status === 'published' ? (
    <span className="overline rounded-full bg-primary px-2.5 py-1 text-primary-foreground">
      {t('badge_live')}
    </span>
  ) : (
    <span
      className={`overline rounded-full px-2.5 py-1 ${
        onImage
          ? 'bg-background text-foreground'
          : 'border border-border text-muted-foreground'
      }`}
    >
      {t('badge_draft')}
    </span>
  )
}

function Meta({ work }: { work: StudioWork }) {
  const tc = useTranslations('categories')

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {work.category && <span>{tc(work.category)}</span>}
      <span className="flex items-center gap-1">
        <Eye size={12} aria-hidden />
        {work.views.toLocaleString()}
      </span>
      <span className="flex items-center gap-1">
        <Heart size={12} aria-hidden />
        {work.likes.toLocaleString()}
      </span>
      {work.assetCount > 0 && (
        <span className="flex items-center gap-1">
          <Paperclip size={12} aria-hidden />
          {work.assetCount}
        </span>
      )}
    </div>
  )
}

/**
 * The creator's own work, in one place.
 *
 * Everything here filters an already-fetched list rather than re-querying: a
 * creator has tens of pieces, not thousands, so search and sort are instant and
 * the page needs no loading states. If that stops being true, this is the seam
 * where a server-side query goes.
 */
export function StudioClient({
  works,
  locale,
  name,
}: {
  works: StudioWork[]
  locale: string
  name: string
}) {
  const t = useTranslations('studio')
  const tc = useTranslations('categories')
  const tCommon = useTranslations('common')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [category, setCategory] = useState('all')
  const [sort, setSort] = useState<SortKey>('newest')
  const [layout, setLayout] = useState<'list' | 'grid'>('list')

  const totals = useMemo(
    () => ({
      works: works.length,
      published: works.filter((w) => w.status === 'published').length,
      drafts: works.filter((w) => w.status === 'draft').length,
      views: works.reduce((sum, w) => sum + w.views, 0),
      likes: works.reduce((sum, w) => sum + w.likes, 0),
    }),
    [works]
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()

    const filtered = works.filter((work) => {
      if (status !== 'all' && work.status !== status) return false
      if (category !== 'all' && work.category !== category) return false
      if (!needle) return true
      return (
        work.title.toLowerCase().includes(needle) ||
        work.tags.some((tag) => tag.includes(needle)) ||
        (work.category ?? '').includes(needle)
      )
    })

    const byDate = (w: StudioWork) => new Date(w.created_at).getTime()
    const sorted = [...filtered]
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => byDate(a) - byDate(b))
        break
      case 'views':
        sorted.sort((a, b) => b.views - a.views)
        break
      case 'likes':
        sorted.sort((a, b) => b.likes - a.likes)
        break
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title, locale))
        break
      default:
        sorted.sort((a, b) => byDate(b) - byDate(a))
    }
    return sorted
  }, [works, query, status, category, sort, locale])

  const filtering = query.trim() !== '' || status !== 'all' || category !== 'all'

  return (
    <div className="mx-auto min-h-[70vh] max-w-[110rem] px-5 pt-32 pb-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="overline text-muted-foreground">{t('kicker')}</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
            {name}
          </h1>
        </div>
        <Link
          href={`/${locale}/upload`}
          className="inline-flex h-12 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85"
        >
          <Plus size={16} aria-hidden />
          {t('new_work')}
        </Link>
      </div>

      {works.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center border-y border-dashed border-border py-28 text-center">
          <p className="font-display text-3xl font-bold tracking-tightest">{t('empty_title')}</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">{t('empty_body')}</p>
          <Link
            href={`/${locale}/upload`}
            className="mt-8 inline-flex h-12 items-center gap-1.5 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            <Plus size={16} aria-hidden />
            {t('empty_cta')}
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label={t('stat_works')} value={totals.works.toLocaleString()} />
            <Stat label={t('stat_published')} value={totals.published.toLocaleString()} />
            <Stat label={t('stat_drafts')} value={totals.drafts.toLocaleString()} />
            <Stat label={t('stat_views')} value={totals.views.toLocaleString()} />
            <Stat label={t('stat_appreciations')} value={totals.likes.toLocaleString()} />
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6">
            <div className="relative min-w-[14rem] flex-1">
              <Search
                size={15}
                aria-hidden
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('search_placeholder')}
                aria-label={t('search_placeholder')}
                className="h-11 rounded-full pl-10"
              />
            </div>

            <div
              role="group"
              aria-label={t('filter_status_aria')}
              className="flex h-11 items-center rounded-full border border-border p-1"
            >
              {STATUSES.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setStatus(option.key)}
                  aria-pressed={status === option.key}
                  className={`h-9 rounded-full px-4 text-sm font-medium transition-colors ${
                    status === option.key
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t(option.label)}
                </button>
              ))}
            </div>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label={t('filter_category_aria')}
              className={selectClass}
            >
              <option value="all">{t('all_categories')}</option>
              {CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {tc(c.key)}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={t('sort_aria')}
              className={selectClass}
            >
              {SORTS.map((option) => (
                <option key={option.key} value={option.key}>
                  {t(option.label)}
                </option>
              ))}
            </select>

            <div
              role="group"
              aria-label={t('layout_aria')}
              className="flex h-11 items-center rounded-full border border-border p-1"
            >
              {([
                ['list', List, 'layout_list'],
                ['grid', LayoutGrid, 'layout_grid'],
              ] as const).map(([key, Icon, labelKey]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLayout(key)}
                  aria-pressed={layout === key}
                  aria-label={t(labelKey)}
                  className={`inline-flex size-9 items-center justify-center rounded-full transition-colors ${
                    layout === key
                      ? 'bg-foreground text-background'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon size={15} aria-hidden />
                </button>
              ))}
            </div>
          </div>

          <p className="mt-4 text-xs text-muted-foreground" aria-live="polite">
            {visible.length === works.length
              ? t('count_all', { count: works.length })
              : t('count_filtered', { shown: visible.length, total: works.length })}
          </p>

          {visible.length === 0 ? (
            <div className="mt-6 border-y border-dashed border-border py-24 text-center">
              <p className="font-display text-2xl font-bold tracking-tightest">
                {t('no_match_title')}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{t('no_match_body')}</p>
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('')
                    setStatus('all')
                    setCategory('all')
                  }}
                  className="mt-6 inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  {t('clear_filters')}
                </button>
              )}
            </div>
          ) : layout === 'list' ? (
            <ul className="mt-2 divide-y divide-border">
              {visible.map((work) => (
                <li key={work.id} className="flex items-center gap-4 py-4 sm:gap-6">
                  <Link
                    href={`/${locale}/portfolio/${work.id}`}
                    className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-secondary sm:w-32"
                  >
                    {work.thumbnail_url ? (
                      <Image
                        src={work.thumbnail_url}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="128px"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="overline text-muted-foreground">
                          {work.category ? tc(work.category) : '—'}
                        </span>
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/${locale}/portfolio/${work.id}`}
                        className="truncate font-display text-xl font-bold tracking-tightest text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline sm:text-2xl"
                      >
                        {work.title}
                      </Link>
                      <StatusBadge status={work.status} />
                    </div>
                    <Meta work={work} />
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <StatusToggle
                      id={work.id}
                      title={work.title}
                      status={work.status}
                      compact
                    />
                    <CopyLink href={`/${locale}/portfolio/${work.id}`} compact />
                    <Link
                      href={`/${locale}/portfolio/${work.id}/edit`}
                      aria-label={t('edit_aria', { title: work.title })}
                      className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Pencil size={16} aria-hidden />
                    </Link>
                    <DeletePortfolioButton id={work.id} title={work.title} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-2 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((work) => (
                <li key={work.id} className="flex flex-col">
                  <Link
                    href={`/${locale}/portfolio/${work.id}`}
                    className="relative aspect-[4/3] overflow-hidden rounded-md bg-secondary"
                  >
                    {work.thumbnail_url ? (
                      <Image
                        src={work.thumbnail_url}
                        alt=""
                        fill
                        className="object-cover transition-transform duration-500 hover:scale-[1.03]"
                        sizes="(min-width: 1280px) 20rem, (min-width: 640px) 40vw, 100vw"
                      />
                    ) : (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="overline text-muted-foreground">
                          {work.category ? tc(work.category) : '—'}
                        </span>
                      </span>
                    )}
                    <span className="absolute top-3 left-3">
                      <StatusBadge status={work.status} onImage />
                    </span>
                  </Link>

                  <Link
                    href={`/${locale}/portfolio/${work.id}`}
                    className="mt-3 truncate font-display text-xl font-bold tracking-tightest decoration-primary decoration-2 underline-offset-4 hover:underline"
                  >
                    {work.title}
                  </Link>
                  <Meta work={work} />

                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <StatusToggle id={work.id} title={work.title} status={work.status} />
                    <CopyLink href={`/${locale}/portfolio/${work.id}`} />
                    <Link
                      href={`/${locale}/portfolio/${work.id}/edit`}
                      aria-label={t('edit_aria', { title: work.title })}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium transition-colors hover:bg-secondary"
                    >
                      <Pencil size={13} aria-hidden />
                      {tCommon('edit')}
                    </Link>
                    <DeletePortfolioButton id={work.id} title={work.title} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
