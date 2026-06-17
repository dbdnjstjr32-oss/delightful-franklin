'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function CTASection({ locale }: { locale: string }) {
  const t = useTranslations('sections')

  return (
    <section className="py-32 px-6">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        >
          {/* Decorative line */}
          <div className="w-px h-16 bg-gradient-to-b from-transparent via-border to-transparent mx-auto mb-12" />

          <h2 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
            {t('cta_title')}
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-md mx-auto">
            {t('cta_sub')}
          </p>

          <Link
            href={`/${locale}/login`}
            className="group inline-flex items-center gap-2 bg-foreground text-background px-10 py-4 rounded-full font-semibold text-base hover:opacity-80 transition-opacity"
          >
            {t('cta_button')}
            <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <p className="text-xs text-muted-foreground/60 mt-6">
            신용카드 불필요 · 영구 무료
          </p>
        </motion.div>
      </div>
    </section>
  )
}
