'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'

const revealVariant = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  },
}

interface Props {
  portfolios: Portfolio[]
  locale: string
}

export function FeaturedSection({ portfolios, locale }: Props) {
  const t = useTranslations('sections')

  if (!portfolios.length) return null

  return (
    <section className="py-24 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
          variants={revealVariant}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-2">Editor&apos;s Pick</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('featured')}</h2>
          </div>
          <a href={`/${locale}/explore`} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            See all →
          </a>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {portfolios.map((portfolio, i) => (
            <motion.div
              key={portfolio.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            >
              <PortfolioCard portfolio={portfolio} locale={locale} priority={i < 3} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
