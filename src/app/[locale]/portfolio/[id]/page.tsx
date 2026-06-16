import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { PortfolioHero } from '@/features/portfolio/PortfolioHero'
import { PortfolioStory } from '@/features/portfolio/PortfolioStory'
import { CreatorCard } from '@/features/portfolio/CreatorCard'
import { PortfolioJsonLd } from '@/components/seo/PortfolioJsonLd'
import { getPortfolioById } from '@/features/portfolio/data'

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
  // of read-then-write. The client is created HERE (during render) — calling
  // cookies()/createClient() inside the `after` callback of a Server Component
  // throws, so we capture it first and only run the RPC in the callback.
  const supabase = await createClient()
  after(async () => {
    await supabase.rpc('increment_portfolio_views', { p_id: id })
  })

  const tags =
    portfolio.portfolio_tags
      ?.map((pt: { tags: { name: string } | null }) => pt.tags?.name)
      .filter(Boolean) ?? []

  const profile = Array.isArray(portfolio.profiles) ? portfolio.profiles[0] : portfolio.profiles

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
      <PortfolioHero portfolio={portfolio} tags={tags} locale={locale} />
      <PortfolioStory portfolio={portfolio} />
      <CreatorCard profile={profile} locale={locale} />
    </div>
  )
}
