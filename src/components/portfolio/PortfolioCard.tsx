'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Heart } from 'lucide-react'

export interface Portfolio {
  id: string
  title: string
  thumbnail_url: string | null
  category: string | null
  views: number
  likes: number
  profiles?: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
  portfolio_tags?: { tags: { name: string } | null }[]
}

interface PortfolioCardProps {
  portfolio: Portfolio
  locale: string
  priority?: boolean
}

export function PortfolioCard({ portfolio, locale, priority = false }: PortfolioCardProps) {
  const tags = portfolio.portfolio_tags?.map(pt => pt.tags?.name).filter(Boolean).slice(0, 3) ?? []
  const creatorName = portfolio.profiles?.display_name || portfolio.profiles?.username || 'Unknown'

  return (
    <Link href={`/${locale}/portfolio/${portfolio.id}`} className="block group">
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-secondary aspect-[4/3] cursor-pointer"
        whileHover={{ scale: 1.02, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      >
        {/* Image */}
        {portfolio.thumbnail_url ? (
          <Image
            src={portfolio.thumbnail_url}
            alt={portfolio.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
            <span className="text-3xl text-muted-foreground/40 font-light">
              {portfolio.category || '✦'}
            </span>
          </div>
        )}

        {/* Hover Overlay */}
        <motion.div
          className="absolute inset-0 flex flex-col justify-end p-5"
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          }}
        >
          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium text-white/80 bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="text-white font-semibold text-base leading-tight mb-1 line-clamp-2">
            {portfolio.title}
          </h3>

          {/* Creator + Stats */}
          <div className="flex items-center justify-between">
            <span className="text-white/70 text-xs font-medium">
              by {creatorName}
            </span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Eye size={11} />
                {portfolio.views.toLocaleString()}
              </span>
              <span className="flex items-center gap-1 text-white/70 text-xs">
                <Heart size={11} />
                {portfolio.likes.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </Link>
  )
}
