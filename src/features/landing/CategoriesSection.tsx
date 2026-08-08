'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Code2, Palette, Box, Film, Camera, PenLine, Music } from 'lucide-react'
import { SectionHeading } from '@/features/landing/SectionHeading'
import { useReveal } from '@/lib/motion'

// Icons only — the previous per-category pastel palette (seven background and
// seven foreground colours) fought the ink/lime system and had no dark-mode
// equivalent.
const CATEGORIES = [
  { key: 'development', icon: Code2 },
  { key: 'design', icon: Palette },
  { key: '3d', icon: Box },
  { key: 'video', icon: Film },
  { key: 'photography', icon: Camera },
  { key: 'writing', icon: PenLine },
  { key: 'music', icon: Music },
] as const

export function CategoriesSection({ locale }: { locale: string }) {
  const t = useTranslations('sections')
  const tc = useTranslations('categories')
  const reveal = useReveal()

  return (
    <section className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[110rem]">
        <SectionHeading kicker={t('categories_kicker')} title={t('categories')} />

        <div className="grid grid-cols-1 border-t border-l border-border sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map(({ key, icon: Icon }, i) => (
            <motion.div key={key} {...reveal(i)}>
              <Link
                href={`/${locale}/explore?category=${key}`}
                className="group relative flex h-full min-h-40 flex-col justify-between border-r border-b border-border p-6 transition-colors hover:bg-primary"
              >
                <div className="flex items-start justify-between">
                  <Icon
                    size={22}
                    aria-hidden
                    className="text-muted-foreground transition-colors group-hover:text-primary-foreground"
                  />
                  <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <span className="font-display text-2xl font-bold tracking-tightest text-foreground transition-colors group-hover:text-primary-foreground">
                  {tc(key)}
                </span>
              </Link>
            </motion.div>
          ))}

          {/* Fills the trailing cell so the rule grid stays rectangular. */}
          <div className="hidden border-r border-b border-border lg:block" />
        </div>
      </div>
    </section>
  )
}
