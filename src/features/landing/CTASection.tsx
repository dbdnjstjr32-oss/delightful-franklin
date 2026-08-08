'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { useReveal } from '@/lib/motion'

/** Full-bleed lime block — the one place the accent takes the whole surface.
 *  Text on lime is always ink; white would sit at ~1.2:1. */
export function CTASection({ locale }: { locale: string }) {
  const t = useTranslations('sections')
  const reveal = useReveal()

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-[110rem] px-5 py-28 sm:px-8 sm:py-36">
        <motion.div {...reveal()}>
          <h2 className="max-w-4xl font-display text-[clamp(2.5rem,7vw,6rem)] font-extrabold leading-[0.95] tracking-tightest">
            {t('cta_title')}
          </h2>

          <div className="mt-12 flex flex-col gap-8 border-t border-primary-foreground/20 pt-8 md:flex-row md:items-center md:justify-between">
            <p className="max-w-sm text-base text-primary-foreground/80">{t('cta_sub')}</p>

            <div className="flex flex-col items-start gap-3">
              <Link
                href={`/${locale}/login`}
                className="group inline-flex items-center gap-2 rounded-full bg-primary-foreground px-8 py-4 text-base font-semibold text-primary transition-opacity hover:opacity-85"
              >
                {t('cta_button')}
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="transition-transform group-hover:translate-x-0.5"
                />
              </Link>
              <p className="text-xs text-primary-foreground/70">{t('cta_note')}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
