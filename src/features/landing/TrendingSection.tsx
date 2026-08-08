'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'
import { MasonryGrid } from '@/components/portfolio/MasonryGrid'
import { SectionHeading } from '@/features/landing/SectionHeading'
import { useReveal } from '@/lib/motion'

interface Props {
  portfolios: Portfolio[]
  locale: string
}

export function TrendingSection({ portfolios, locale }: Props) {
  const t = useTranslations('sections')
  const reveal = useReveal()

  if (!portfolios.length) return null

  return (
    <section className="border-y border-border bg-secondary/40 px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[110rem]">
        <SectionHeading
          kicker={t('trending_kicker')}
          title={t('trending')}
          href={`/${locale}/explore?tab=trending`}
          linkLabel={t('see_all')}
        />

        <MasonryGrid>
          {portfolios.map((portfolio, i) => (
            <motion.div key={portfolio.id} {...reveal(i)}>
              <PortfolioCard portfolio={portfolio} locale={locale} />
            </motion.div>
          ))}
        </MasonryGrid>
      </div>
    </section>
  )
}
