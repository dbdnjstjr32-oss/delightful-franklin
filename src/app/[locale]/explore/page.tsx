import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { ExploreClient } from '@/features/explore/ExploreClient'
import { PORTFOLIO_CARD_COLUMNS } from '@/lib/queries'
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

  // Latest
  const { data: latest } = await supabase
    .from('portfolios')
    .select(PORTFOLIO_CARD_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(24)

  // Trending (likes desc as proxy for trending score)
  const { data: trending } = await supabase
    .from('portfolios')
    .select(PORTFOLIO_CARD_COLUMNS)
    .order('likes', { ascending: false })
    .order('views', { ascending: false })
    .limit(24)

  // New Creators (with ≥1 portfolio)
  const { data: rawCreators } = await supabase
    .from('profiles')
    .select('*, portfolios(count)')
    .not('username', 'is', null)
    .order('created_at', { ascending: false })
    .limit(40)
  const newCreators = (rawCreators ?? []).filter(
    (p: { portfolios: { count: number }[] }) => p.portfolios?.[0]?.count >= 1
  ).slice(0, 24)

  return (
    <div className="pt-16 min-h-screen">
      <ExploreClient
        locale={locale}
        initialTab={tab}
        initialCategory={category ?? null}
        initialQuery={q ?? ''}
        latest={(latest ?? []) as unknown as Portfolio[]}
        trending={(trending ?? []) as unknown as Portfolio[]}
        newCreators={newCreators}
      />
    </div>
  )
}
