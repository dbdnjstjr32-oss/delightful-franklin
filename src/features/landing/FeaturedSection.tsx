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

export function FeaturedSection({ portfolios, locale }: Props) {
  const t = useTranslations('sections')
  const reveal = useReveal()

  if (!portfolios.length) return null

  return (
    <section className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[110rem]">
        <SectionHeading
          kicker={t('featured_kicker')}
          title={t('featured')}
          href={`/${locale}/explore`}
          linkLabel={t('see_all')}
        />

        <MasonryGrid>
          {portfolios.map((portfolio, i) => (
            <motion.div key={portfolio.id} {...reveal(i)}>
              {/* The first row is the LCP candidate on most viewports. */}
              <PortfolioCard portfolio={portfolio} locale={locale} priority={i < 3} />
            </motion.div>
          ))}
        </MasonryGrid>
      </div>
    </section>
  )
}
