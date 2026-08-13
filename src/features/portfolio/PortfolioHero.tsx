'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Eye, ExternalLink } from 'lucide-react'
import { aspectRatio } from '@/lib/presentation'

interface Props {
  portfolio: {
    title: string
    thumbnail_url: string | null
    thumbnail_width?: number | null
    thumbnail_height?: number | null
    thumbnail_ratio?: string | null
    project_url: string | null
    category: string | null
    views: number
    likes: number
    created_at: string
  }
  tags: string[]
  locale: string
  likeControl?: React.ReactNode
}

export function PortfolioHero({ portfolio, tags, locale, likeControl }: Props) {
  const formattedDate = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(portfolio.created_at))

  // The creator's chosen frame wins, then the file's own shape. With neither,
  // the hero keeps its own 16:9 rather than the shared 4:3 fallback — this is a
  // full-bleed banner, not a card.
  const knownShape =
    !!portfolio.thumbnail_ratio || !!(portfolio.thumbnail_width && portfolio.thumbnail_height)
  const ratio = knownShape
    ? aspectRatio(portfolio.thumbnail_ratio, portfolio.thumbnail_width, portfolio.thumbnail_height)
    : '16 / 9'

  return (
    <section>
      {/* Title first, image second: the headline is the entry point, and the
          cover then gets the full width it deserves. */}
      <div className="mx-auto max-w-[110rem] px-5 pt-14 pb-12 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {portfolio.category && (
            <span className="overline text-muted-foreground">{portfolio.category}</span>
          )}
          <span aria-hidden className="h-px w-8 bg-border" />
          <time className="text-sm text-muted-foreground">{formattedDate}</time>
        </div>

        <h1 className="mt-6 max-w-5xl font-display text-[clamp(2.25rem,6vw,5.5rem)] font-extrabold leading-[0.95] tracking-tightest text-foreground">
          {portfolio.title}
        </h1>

        {/* The description is not repeated here — PortfolioStory renders it in
            full below the cover, magazine order: headline, image, article. */}
        <div className="mt-10 flex flex-wrap items-center gap-6 border-t border-border pt-6">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Eye size={15} aria-hidden />
            {portfolio.views.toLocaleString()} views
          </span>

          {likeControl}

          {portfolio.project_url && (
            <a
              href={portfolio.project_url}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
            >
              Visit project
              <ExternalLink size={13} aria-hidden />
            </a>
          )}
        </div>
      </div>

      {/* Capped at 80vh. The cover is full-bleed, so without a ceiling its
          height is just viewport width ÷ ratio — a 3:4 phone photo came out
          ~1900px tall on a 1440px screen, and a 9:16 screenshot ~2500px, so the
          cover alone was two screens before the reader reached anything else.
          When the cap bites, the box is wider than its ratio and object-cover
          crops it rather than letterboxing. */}
      <div
        className="relative max-h-[80vh] w-full overflow-hidden bg-secondary"
        style={{ aspectRatio: ratio }}
      >
        {portfolio.thumbnail_url ? (
          <Image
            src={portfolio.thumbnail_url}
            alt={portfolio.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="overline text-muted-foreground">{portfolio.category ?? 'No cover'}</span>
          </div>
        )}
      </div>

      {tags.length > 0 && (
        <div className="mx-auto max-w-[110rem] px-5 pt-8 sm:px-8">
          <ul className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag}>
                <Link
                  href={`/${locale}/explore?tag=${tag}`}
                  className="inline-flex rounded-full border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {tag}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
