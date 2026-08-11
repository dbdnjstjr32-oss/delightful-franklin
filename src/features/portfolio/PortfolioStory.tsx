'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useReveal } from '@/lib/motion'

interface Props {
  portfolio: {
    description: string | null
    project_url: string | null
  }
}

/** The long-form half of the detail page.
 *
 *  This used to render five fixed sections — a three-step "process", three
 *  question-and-answer blocks, and a six-tile gallery — all filled with
 *  placeholder prose and empty image boxes, on every portfolio regardless of
 *  what the creator actually wrote. There are no columns behind any of it, so
 *  it was invented content on someone else's work page. Until the schema
 *  carries those fields, this renders only what exists: the description.
 */
export function PortfolioStory({ portfolio }: Props) {
  const t = useTranslations('work')
  const reveal = useReveal()

  if (!portfolio.description) return null

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[110rem] px-5 py-24 sm:px-8">
        <motion.div {...reveal()} className="grid gap-10 md:grid-cols-[16rem_1fr]">
          <h2 className="overline text-muted-foreground">{t('about')}</h2>
          {/* Measure capped near 70 characters — the readable line length for
              long-form text at this size. */}
          <div className="max-w-[65ch] space-y-6 text-lg leading-relaxed text-foreground/85">
            {portfolio.description
              .split(/\n{2,}/)
              .map((paragraph, i) => (
                <p key={i} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}
