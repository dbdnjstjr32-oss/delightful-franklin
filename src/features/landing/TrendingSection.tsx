'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'
import { TrendingUp } from 'lucide-react'

interface Props {
  portfolios: Portfolio[]
  locale: string
}

export function TrendingSection({ portfolios, locale }: Props) {
  const t = useTranslations('sections')

  if (!portfolios.length) return null

  return (
    <section className="py-24 px-6 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="flex items-end justify-between mb-12"
        >
          <div>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-primary" />
              <p className="text-xs font-medium text-primary uppercase tracking-widest">Rising Fast</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('trending')}</h2>
          </div>
          <a href={`/${locale}/explore?tab=trending`} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
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
              <PortfolioCard portfolio={portfolio} locale={locale} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
