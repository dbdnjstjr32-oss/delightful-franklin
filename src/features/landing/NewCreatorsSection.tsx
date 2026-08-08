'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { SectionHeading } from '@/features/landing/SectionHeading'
import { useReveal } from '@/lib/motion'

interface Creator {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  portfolios: { count: number }[]
}

interface Props {
  creators: Creator[]
  locale: string
}

export function NewCreatorsSection({ creators, locale }: Props) {
  const t = useTranslations('sections')
  const reveal = useReveal()

  if (!creators.length) return null

  return (
    <section className="border-t border-border px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-[110rem]">
        <SectionHeading
          kicker={t('new_creators_kicker')}
          title={t('new_creators')}
          href={`/${locale}/explore?tab=creators`}
          linkLabel={t('see_all')}
        />

        {/* A roster list rather than an avatar row: names carry the section, and
            it reads the same on a phone as on a wide screen. */}
        <ul>
          {creators.map((creator, i) => {
            const name = creator.display_name || creator.username || 'Creator'
            const count = creator.portfolios?.[0]?.count ?? 0

            return (
              <motion.li key={creator.id} {...reveal(i)} className="border-b border-border">
                <Link
                  href={`/${locale}/u/${creator.username}`}
                  className="group flex items-center gap-4 py-5 transition-colors hover:bg-secondary/60 sm:gap-6"
                >
                  <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border">
                    {creator.avatar_url ? (
                      <Image
                        src={creator.avatar_url}
                        alt=""
                        width={48}
                        height={48}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-semibold text-muted-foreground">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-xl font-bold tracking-tightest text-foreground sm:text-2xl">
                      {name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      @{creator.username}
                    </span>
                  </span>

                  <span className="shrink-0 pr-1 text-sm text-muted-foreground">
                    {t('work_count', { count })}
                  </span>
                </Link>
              </motion.li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
