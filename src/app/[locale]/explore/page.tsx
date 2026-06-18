import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ExploreClient } from '@/features/explore/ExploreClient'
import { PORTFOLIO_CARD_COLUMNS } from '@/lib/queries'
import { translateText } from '@/lib/translate'
import type { Portfolio } from '@/components/portfolio/PortfolioCard'

type Props = { params: Promise<{ locale: string }>; searchParams: Promise<{ tab?: string; category?: string; q?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'
  return {
    title: 'Explore — Showcase',
    description: 'Discover the world\'s best creative portfolios across design, development, 3D, video, and more.',
    alternates: {
      canonical: `${BASE_URL}/${locale}/explore`,
      languages: Object.fromEntries(
        ['ko', 'en', 'ja', 'es'].map((l) => [l, `${BASE_URL}/${l}/explore`])
      ),
    },
    openGraph: {
      title: 'Explore — Showcase',
      description: 'Discover the world\'s best creative portfolios.',
      type: 'website',
    },
  }
}

export default async function ExplorePage({ params, searchParams }: Props) {
  const { locale } = await params
  const { tab = 'latest', category, q } = await searchParams
  const supabase = await createClient()

  // Fetch all initial data in parallel to prevent sequential waterfall bottlenecks
  const [
    { data: latest },
    { data: trending },
    { data: rawCreators }
  ] = await Promise.all([
    supabase
      .from('portfolios')
      .select(PORTFOLIO_CARD_COLUMNS)
      .order('created_at', { ascending: false })
      .limit(24),
    supabase
      .from('portfolios')
      .select(PORTFOLIO_CARD_COLUMNS)
      .order('likes', { ascending: false })
      .order('views', { ascending: false })
      .limit(24),
    supabase
      .from('profiles')
      .select('*, portfolios(count)')
      .not('username', 'is', null)
      .order('created_at', { ascending: false })
      .limit(40)
  ])
  const newCreators = (rawCreators ?? []).filter(
    (p: { portfolios: { count: number }[] }) => p.portfolios?.[0]?.count >= 1
  ).slice(0, 24)

  // Localize the SSR card titles for the current locale.
  const localizeTitles = (rows: Array<{ title: string }> | null) =>
    Promise.all((rows ?? []).map(async (p) => ({ ...p, title: await translateText(p.title, locale) })))
  const [latestL, trendingL] = await Promise.all([localizeTitles(latest), localizeTitles(trending)])

  return (
    <div className="pt-16 min-h-screen">
      <ExploreClient
        locale={locale}
        initialTab={tab}
        initialCategory={category ?? null}
        initialQuery={q ?? ''}
        latest={latestL as unknown as Portfolio[]}
        trending={trendingL as unknown as Portfolio[]}
        newCreators={newCreators}
      />
    </div>
  )
}
