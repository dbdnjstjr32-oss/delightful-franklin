import { createClient } from '@/lib/supabase/server'
import { PORTFOLIO_CARD_COLUMNS } from '@/lib/queries'
import { translateText } from '@/lib/translate'
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

  // Localize card titles for the current locale (cached; falls back to source).
  const localizeTitles = (rows: Array<{ title: string }> | null) =>
    Promise.all((rows ?? []).map(async (p) => ({ ...p, title: await translateText(p.title, locale) })))
  const [featuredL, trendingL] = await Promise.all([localizeTitles(featured), localizeTitles(trending)])

  return (
    <>
      <HeroSection locale={locale} />
      <FeaturedSection portfolios={featuredL as unknown as Portfolio[]} locale={locale} />
      <TrendingSection portfolios={trendingL as unknown as Portfolio[]} locale={locale} />
      <NewCreatorsSection creators={filteredNewCreators} locale={locale} />
      <CategoriesSection locale={locale} />
      <CTASection locale={locale} />
    </>
  )
}
