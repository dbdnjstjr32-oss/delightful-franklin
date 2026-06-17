'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles } from 'lucide-react'

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

  if (!creators.length) return null

  return (
    <section className="py-24 px-6">
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
              <Sparkles size={14} className="text-primary" />
              <p className="text-xs font-medium text-primary uppercase tracking-widest">Just Joined</p>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('new_creators')}</h2>
          </div>
          <a href={`/${locale}/explore?tab=creators`} className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            See all →
          </a>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
          {creators.map((creator, i) => (
            <motion.div
              key={creator.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            >
              <Link
                href={`/${locale}/u/${creator.username}`}
                className="group flex flex-col items-center text-center gap-3"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden ring-2 ring-transparent group-hover:ring-primary/30 transition-all duration-200">
                  {creator.avatar_url ? (
                    <Image
                      src={creator.avatar_url}
                      alt={creator.display_name || creator.username || ''}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-semibold text-muted-foreground">
                      {(creator.display_name || creator.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold leading-tight group-hover:text-primary transition-colors">
                    {creator.display_name || creator.username || 'Creator'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    @{creator.username}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
