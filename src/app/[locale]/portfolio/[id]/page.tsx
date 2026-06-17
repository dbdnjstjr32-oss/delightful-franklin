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
        <div className="max-w-4xl mx-auto px-6 pt-4 flex justify-end">
          <Link
            href={`/${locale}/portfolio/${portfolio.id}/edit`}
            className="flex items-center gap-1.5 text-sm font-medium bg-secondary text-foreground px-4 py-2 rounded-full hover:bg-accent transition-colors"
          >
            <Pencil size={14} />
            Edit
          </Link>
        </div>
      )}
      <PortfolioHero portfolio={portfolio} tags={tags} locale={locale} />
      <PortfolioStory portfolio={portfolio} />
      <CreatorCard profile={profile} locale={locale} />
    </div>
  )
}
