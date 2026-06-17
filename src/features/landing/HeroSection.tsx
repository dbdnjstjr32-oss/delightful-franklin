'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
  }),
}

export function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations('hero')

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0,113,227,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,1) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="inline-flex items-center gap-2 bg-primary/8 text-primary border border-primary/20 rounded-full px-4 py-1.5 text-xs font-medium mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          The Home For Creative Work
        </motion.div>

        {/* Headline */}
        <div className="space-y-2 mb-8">
          {[t('line1'), t('line2'), t('line3')].map((line, i) => (
            <motion.h1
              key={line}
              custom={i + 1}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-foreground leading-[1.05]"
            >
              {line}
            </motion.h1>
          ))}
        </div>

        {/* Sub */}
        <motion.p
          custom={4}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-12"
        >
          {t('sub')}
        </motion.p>

        {/* CTAs */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            href={`/${locale}/upload`}
            className="group flex items-center gap-2 bg-foreground text-background px-8 py-3.5 rounded-full font-semibold text-sm hover:opacity-80 transition-opacity"
          >
            {t('cta_upload')}
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <Link
            href={`/${locale}/explore`}
            className="flex items-center gap-2 bg-secondary text-foreground px-8 py-3.5 rounded-full font-semibold text-sm hover:bg-accent transition-colors"
          >
            {t('cta_explore')}
          </Link>
        </motion.div>

        {/* Scroll hint */}
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          className="mt-20 flex flex-col items-center gap-2"
        >
          <span className="text-xs text-muted-foreground/60 tracking-widest uppercase">Scroll</span>
          <motion.div
            className="w-px h-12 bg-gradient-to-b from-border to-transparent"
            animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          />
        </motion.div>
      </div>
    </section>
  )
}
