import { createClient } from '@/lib/supabase/server'
import { PORTFOLIO_CARD_COLUMNS } from '@/lib/queries'
import type { Portfolio } from '@/components/portfolio/PortfolioCard'
import { HeroSection } from '@/features/landing/HeroSection'
import { FeaturedSection } from '@/features/landing/FeaturedSection'
import { TrendingSection } from '@/features/landing/TrendingSection'
import { NewCreatorsSection } from '@/features/landing/NewCreatorsSection'
import { CategoriesSection } from '@/features/landing/CategoriesSection'
import { CTASection } from '@/features/landing/CTASection'

type Props = { params: Promise<{ locale: string }> }

export default async function HomePage({ params }: Props) {
  const { locale } = await params
  const supabase = await createClient()

  // Fetch all initial data in parallel to prevent sequential waterfall bottlenecks
  const [
    { data: featured },
    { data: trending },
    { data: newCreators }
  ] = await Promise.all([
    supabase
      .from('portfolios')
      .select(PORTFOLIO_CARD_COLUMNS)
      .eq('featured', true)
      .limit(6),
    supabase
      .from('portfolios')
      .select(PORTFOLIO_CARD_COLUMNS)
      .order('likes', { ascending: false })
      .order('views', { ascending: false })
      .limit(6),
    supabase
      .from('profiles')
      .select('*, portfolios(count)')
      .order('created_at', { ascending: false })
      .limit(8)
  ])

  // Filter to only those with at least 1 portfolio
  const filteredNewCreators = (newCreators ?? []).filter(
    (p: { portfolios: { count: number }[] }) => p.portfolios?.[0]?.count >= 1
  ).slice(0, 6)

  return (
    <>
      <HeroSection locale={locale} />
      <FeaturedSection portfolios={(featured ?? []) as unknown as Portfolio[]} locale={locale} />
      <TrendingSection portfolios={(trending ?? []) as unknown as Portfolio[]} locale={locale} />
      <NewCreatorsSection creators={filteredNewCreators} locale={locale} />
      <CategoriesSection locale={locale} />
      <CTASection locale={locale} />
    </>
  )
}
