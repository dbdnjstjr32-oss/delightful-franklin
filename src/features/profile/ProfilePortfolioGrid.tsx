'use client'

import { motion } from 'framer-motion'
import { PortfolioCard, Portfolio } from '@/components/portfolio/PortfolioCard'

interface Props {
  portfolios: Portfolio[]
  locale: string
  username: string
}

export function ProfilePortfolioGrid({ portfolios, locale }: Props) {
  return (
    <section className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="text-xl font-semibold mb-10"
        >
          작품 <span className="text-muted-foreground font-normal ml-2 text-base">{portfolios.length}개</span>
        </motion.h2>

        {portfolios.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-5">
              <span className="text-2xl">✦</span>
            </div>
            <p className="text-muted-foreground text-sm">아직 업로드된 포트폴리오가 없습니다.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {portfolios.map((portfolio, i) => (
              <motion.div
                key={portfolio.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.07, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
              >
                <PortfolioCard portfolio={portfolio} locale={locale} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
