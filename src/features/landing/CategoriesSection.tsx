'use client'

import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Code2, Palette, Box, Film, Camera, PenLine, Music } from 'lucide-react'

const CATEGORIES = [
  { key: 'development', icon: Code2, color: '#0071E3', bg: '#E8F1FB' },
  { key: 'design', icon: Palette, color: '#FF375F', bg: '#FFEDF0' },
  { key: '3d', icon: Box, color: '#FF9500', bg: '#FFF4E5' },
  { key: 'video', icon: Film, color: '#30D158', bg: '#E8FAF0' },
  { key: 'photography', icon: Camera, color: '#AF52DE', bg: '#F4EAFB' },
  { key: 'writing', icon: PenLine, color: '#FF6961', bg: '#FFEEE0' },
  { key: 'music', icon: Music, color: '#5856D6', bg: '#EEEEFF' },
] as const

export function CategoriesSection({ locale }: { locale: string }) {
  const t = useTranslations('sections')
  const tc = useTranslations('categories')

  return (
    <section className="py-24 px-6 bg-secondary/30">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">{t('categories')}</h2>
          <p className="text-muted-foreground mt-3 text-base">어떤 분야의 작품을 찾으시나요?</p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {CATEGORIES.map(({ key, icon: Icon, color, bg }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.92 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
            >
              <Link
                href={`/${locale}/explore?category=${key}`}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border hover:border-transparent hover:shadow-md transition-all duration-200"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110"
                  style={{ backgroundColor: bg }}
                >
                  <Icon size={22} style={{ color }} />
                </div>
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors text-center leading-tight">
                  {tc(key)}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
