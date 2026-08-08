'use client'

import { useTranslations } from 'next-intl'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { EDITORIAL_EASE } from '@/lib/motion'

export function HeroSection({ locale }: { locale: string }) {
  const t = useTranslations('hero')
  const prefersReduced = useReducedMotion()

  const lines = [t('line1'), t('line2'), t('line3')]

  // Entrance only — no scroll trigger, this is above the fold.
  const enter = (index: number) =>
    prefersReduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
      : {
          initial: { opacity: 0, y: 40 },
          animate: { opacity: 1, y: 0 },
          transition: { delay: index * 0.09, duration: 0.8, ease: EDITORIAL_EASE },
        }

  return (
    <section className="relative flex min-h-[92vh] flex-col justify-end overflow-hidden pt-28 pb-14">
      {/* Hairline grid — structure, not decoration: it sets the column rhythm
          the headline is aligned to. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06] dark:opacity-[0.12]"
        style={{
          backgroundImage:
            'linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '12.5% 100%',
        }}
      />

      <div className="mx-auto w-full max-w-[110rem] px-5 sm:px-8">
        <motion.p
          {...enter(0)}
          className="overline inline-flex items-center gap-2 text-muted-foreground"
        >
          <span aria-hidden className="size-1.5 rounded-full bg-primary" />
          {t('badge')}
        </motion.p>

        <h1 className="mt-8 font-display font-extrabold tracking-tightest text-foreground">
          {lines.map((line, i) => (
            <motion.span
              key={line}
              {...enter(i + 1)}
              className={`block text-[clamp(3rem,11vw,10rem)] leading-[0.9] ${
                i === lines.length - 1 ? 'text-muted-foreground' : ''
              }`}
            >
              {line}
            </motion.span>
          ))}
        </h1>

        {/* Sub + actions sit on the same baseline row — the asymmetry is the
            point: text left, actions right. */}
        <div className="mt-14 flex flex-col gap-10 border-t border-border pt-8 md:flex-row md:items-start md:justify-between">
          <motion.p
            {...enter(4)}
            className="max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            {t('sub')}
          </motion.p>

          <motion.div {...enter(5)} className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/upload`}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85"
            >
              {t('cta_upload')}
              <ArrowRight
                size={16}
                aria-hidden
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
            <Link
              href={`/${locale}/explore`}
              className="inline-flex items-center rounded-full border border-border px-7 py-3.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              {t('cta_explore')}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
