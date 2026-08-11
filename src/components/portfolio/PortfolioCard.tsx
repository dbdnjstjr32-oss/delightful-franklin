import Image from 'next/image'
import Link from 'next/link'
import { Eye, Heart } from 'lucide-react'

export interface Portfolio {
  id: string
  title: string
  thumbnail_url: string | null
  thumbnail_width?: number | null
  thumbnail_height?: number | null
  thumbnail_ratio?: string | null
  category: string | null
  views: number
  likes: number
  profiles?: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
  portfolio_tags?: { tags: { name: string } | null }[]
}

interface PortfolioCardProps {
  portfolio: Portfolio
  locale: string
  priority?: boolean
  /** Off on a creator's own page, where the byline is both redundant and
   *  unavailable — that query doesn't join profiles, so the card would have
   *  printed "Unknown" under every one of their works. */
  showCreator?: boolean
}

/** Fallback shape for rows uploaded before dimensions were recorded. */
const FALLBACK_RATIO = 4 / 3
// Extremely tall or wide covers would wreck a masonry column, so the rendered
// box is clamped even when the stored size is genuine.
const MIN_RATIO = 0.6
const MAX_RATIO = 2.2

export function PortfolioCard({
  portfolio,
  locale,
  priority = false,
  showCreator = true,
}: PortfolioCardProps) {
  const creatorName = portfolio.profiles?.display_name || portfolio.profiles?.username || null

  // A ratio the creator picked is deliberate framing, so it is used as given —
  // only the intrinsic size gets clamped, since that is whatever the file
  // happened to be.
  const chosen = portfolio.thumbnail_ratio?.split(':').map(Number)
  const picked =
    chosen?.length === 2 && chosen[0] > 0 && chosen[1] > 0 ? chosen[0] / chosen[1] : null

  const stored =
    portfolio.thumbnail_width && portfolio.thumbnail_height
      ? portfolio.thumbnail_width / portfolio.thumbnail_height
      : null
  const ratio =
    picked ?? Math.min(MAX_RATIO, Math.max(MIN_RATIO, stored ?? FALLBACK_RATIO))

  return (
    <Link href={`/${locale}/portfolio/${portfolio.id}`} className="group block">
      {/* aspect-ratio is set inline because it comes from data, not a token —
          this is what reserves the height before the image loads. */}
      <div
        className="relative w-full overflow-hidden rounded-md bg-secondary"
        style={{ aspectRatio: ratio }}
      >
        {portfolio.thumbnail_url ? (
          <Image
            src={portfolio.thumbnail_url}
            alt=""
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-accent">
            <span className="overline text-muted-foreground">{portfolio.category ?? '—'}</span>
          </div>
        )}
      </div>

      {/* Metadata sits under the image rather than in a hover overlay: on a
          touch screen there is no hover, so an overlay hides it permanently. */}
      <div className="mt-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-base font-bold tracking-tightest text-foreground decoration-primary decoration-2 underline-offset-4 group-hover:underline">
            {portfolio.title}
          </h3>
          {showCreator && creatorName && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">{creatorName}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Eye size={12} aria-hidden />
            {portfolio.views.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} aria-hidden />
            {portfolio.likes.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  )
}
