'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { useReveal } from '@/lib/motion'

interface Props {
  totalViews: number
  totalAppreciations: number
  projectCount: number
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function ProfileStats({ totalViews, totalAppreciations, projectCount }: Props) {
  const t = useTranslations('profile')
  const reveal = useReveal()

  const stats = [
    { key: 'views', label: t('total_views'), value: totalViews },
    { key: 'appreciations', label: t('total_appreciations'), value: totalAppreciations },
    { key: 'projects', label: t('projects'), value: projectCount },
  ]

  return (
    <div className="border-y border-border">
      <div className="mx-auto max-w-[110rem] px-5 sm:px-8">
        <dl className="grid grid-cols-3 divide-x divide-border">
          {stats.map((stat, i) => (
            <motion.div key={stat.key} {...reveal(i)} className="py-8 pr-6 pl-6 first:pl-0">
              <dt className="overline text-muted-foreground">{stat.label}</dt>
              <dd className="mt-3 font-display text-4xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
                {formatNumber(stat.value)}
              </dd>
            </motion.div>
          ))}
        </dl>
      </div>
    </div>
  )
}
