'use client'

import { motion } from 'framer-motion'
import { Eye, Heart, FolderOpen } from 'lucide-react'

interface Props {
  totalViews: number
  totalAppreciations: number
  projectCount: number
}

const stats = [
  { key: 'views', Icon: Eye, label: 'Total Views' },
  { key: 'appreciations', Icon: Heart, label: 'Total Appreciations' },
  { key: 'projects', Icon: FolderOpen, label: 'Projects' },
] as const

function formatNumber(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export function ProfileStats({ totalViews, totalAppreciations, projectCount }: Props) {
  const values: Record<typeof stats[number]['key'], number> = {
    views: totalViews,
    appreciations: totalAppreciations,
    projects: projectCount,
  }

  return (
    <div className="border-y border-border">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid grid-cols-3 divide-x divide-border">
          {stats.map(({ key, Icon, label }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
              className="flex flex-col items-center gap-2 px-6 py-4"
            >
              <Icon size={18} className="text-muted-foreground" />
              <span className="text-2xl md:text-3xl font-bold tracking-tight">
                {formatNumber(values[key])}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
