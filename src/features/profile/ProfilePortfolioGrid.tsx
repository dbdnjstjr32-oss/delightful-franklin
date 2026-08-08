'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'
import { MasonryGrid } from '@/components/portfolio/MasonryGrid'
import { useReveal } from '@/lib/motion'

interface Props {
  portfolios: Portfolio[]
  locale: string
  username: string
}

export function ProfilePortfolioGrid({ portfolios, locale }: Props) {
  const t = useTranslations('profile')
  const tSections = useTranslations('sections')
  const reveal = useReveal()

  return (
    <section className="mx-auto max-w-[110rem] px-5 py-20 sm:px-8">
      <h2 className="mb-10 flex items-baseline gap-3 border-b border-border pb-6">
        <span className="font-display text-3xl font-extrabold tracking-tightest">
          {t('projects')}
        </span>
        <span className="text-sm text-muted-foreground">
          {tSections('work_count', { count: portfolios.length })}
        </span>
      </h2>

      {portfolios.length === 0 ? (
        <div className="flex flex-col items-center justify-center border-y border-dashed border-border py-24 text-center">
          <p className="text-sm text-muted-foreground">{t('no_portfolio')}</p>
        </div>
      ) : (
        <MasonryGrid>
          {portfolios.map((portfolio, i) => (
            <motion.div key={portfolio.id} {...reveal(i % 12)}>
              <PortfolioCard
                portfolio={portfolio}
                locale={locale}
                priority={i < 3}
                showCreator={false}
              />
            </motion.div>
          ))}
        </MasonryGrid>
      )}
    </section>
  )
}
