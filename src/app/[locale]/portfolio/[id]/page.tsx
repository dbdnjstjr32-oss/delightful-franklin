import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import { headers } from 'next/headers'
import { createHash } from 'node:crypto'
import Link from 'next/link'
import { Pencil } from 'lucide-react'
import type { Metadata } from 'next'
import { PortfolioHero } from '@/features/portfolio/PortfolioHero'
import { PortfolioStory } from '@/features/portfolio/PortfolioStory'
import { PortfolioGallery } from '@/features/portfolio/PortfolioGallery'
import { CreatorCard } from '@/features/portfolio/CreatorCard'
import { PortfolioJsonLd } from '@/components/seo/PortfolioJsonLd'
import { LikeButton } from '@/features/portfolio/components/LikeButton'
import { getPortfolioById, toUploadedAssets } from '@/features/portfolio/data'
import { translateText } from '@/lib/translate'
import { getTranslations } from 'next-intl/server'

type Props = {
  params: Promise<{ locale: string; id: string }>
}

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params
  const p = await getPortfolioById(id)

  if (!p) return { title: 'Not Found' }

  const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
  const creatorName = profile?.display_name || profile?.username || 'Creator'

  return {
    title: `${p.title} — ${creatorName} | Showcase`,
    description: p.description || `${p.title} by ${creatorName} on Showcase.`,
    openGraph: {
      title: `${p.title} — ${creatorName}`,
      description: p.description || '',
      images: p.thumbnail_url ? [{ url: p.thumbnail_url, width: 1200, height: 630 }] : [],
      type: 'website',
      url: `${BASE_URL}/${locale}/portfolio/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.title} — ${creatorName}`,
      description: p.description || '',
      images: p.thumbnail_url ? [p.thumbnail_url] : [],
    },
  }
}

export default async function PortfolioDetailPage({ params }: Props) {
  const { locale, id } = await params

  const portfolio = await getPortfolioById(id)

  if (!portfolio) notFound()

  // Increment view count after the response is sent, atomically in the DB.
  // `after` keeps it off the render path; the RPC avoids the lost-update race
  // of read-then-write and dedups by viewer/day to blunt scripted inflation.
  // Request APIs (cookies/headers) must be read HERE during render — calling
  // them inside the `after` callback of a Server Component throws — so we
  // capture the client and a viewer fingerprint first.
  const supabase = await createClient()
  const hdrs = await headers()
  const ip = (hdrs.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  const ua = hdrs.get('user-agent') ?? ''
  const viewer = createHash('sha256').update(`${ip}|${ua}`).digest('hex').slice(0, 32)
  after(async () => {
    await supabase.rpc('increment_portfolio_views', { p_id: id, p_viewer: viewer })
  })

  const tags =
    portfolio.portfolio_tags
      ?.map((pt: { tags: { name: string } | null }) => pt.tags?.name)
      .filter(Boolean) ?? []

  const profile = Array.isArray(portfolio.profiles) ? portfolio.profiles[0] : portfolio.profiles

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const isOwner = !!user && user.id === portfolio.user_id

  let initialLiked = false
  if (user) {
    const { data: likeRow } = await supabase
      .from('portfolio_likes')
      .select('portfolio_id')
      .eq('portfolio_id', id)
      .eq('user_id', user.id)
      .maybeSingle()
    initialLiked = !!likeRow
  }

  // Localize the description for the current locale (no-op when it is already
  // in that language; falls back to the original on any failure). The title is
  // left alone — it is the name of the work, not prose to be rendered into
  // another language.
  const localizedPortfolio = {
    ...portfolio,
    description: await translateText(portfolio.description, locale),
  }

  const [tWork, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'work' }),
    getTranslations({ locale, namespace: 'common' }),
  ])

  return (
    <div className="pt-16">
      <PortfolioJsonLd
        id={portfolio.id}
        title={portfolio.title}
        description={portfolio.description}
        thumbnail_url={portfolio.thumbnail_url}
        created_at={portfolio.created_at}
        locale={locale}
        creator={profile}
      />
      {isOwner && (
        <div className="mx-auto flex max-w-[110rem] items-center justify-end gap-3 px-5 pt-6 sm:px-8">
          {portfolio.status === 'draft' && (
            // Only the owner can load this page while it is a draft (RLS), so
            // the badge doubles as the reminder that nobody else can see it.
            <span className="overline rounded-full border border-border px-3 py-1.5 text-muted-foreground">
              {tWork('draft_badge')}
            </span>
          )}
          <Link
            href={`/${locale}/portfolio/${portfolio.id}/edit`}
            className="inline-flex h-11 items-center gap-1.5 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Pencil size={14} aria-hidden />
            {tCommon('edit')}
          </Link>
        </div>
      )}
      <PortfolioHero
        portfolio={localizedPortfolio}
        tags={tags}
        locale={locale}
        likeControl={
          <LikeButton
            portfolioId={portfolio.id}
            initialLiked={initialLiked}
            initialCount={portfolio.likes ?? 0}
            isAuthed={!!user}
          />
        }
      />
      <PortfolioStory portfolio={localizedPortfolio} />
      <PortfolioGallery assets={toUploadedAssets(portfolio.portfolio_assets)} />
      <CreatorCard profile={profile} locale={locale} />
    </div>
  )
}
