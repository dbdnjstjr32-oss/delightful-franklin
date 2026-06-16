'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, Heart, ExternalLink, Tag } from 'lucide-react'

interface Props {
  portfolio: {
    title: string
    description: string | null
    thumbnail_url: string | null
    project_url: string | null
    category: string | null
    views: number
    likes: number
    created_at: string
  }
  tags: string[]
  locale: string
}

export function PortfolioHero({ portfolio, tags, locale }: Props) {
  const formattedDate = new Date(portfolio.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <section>
      {/* Full-width Hero Image */}
      <div className="relative w-full aspect-[21/9] bg-secondary overflow-hidden">
        {portfolio.thumbnail_url ? (
          <Image
            src={portfolio.thumbnail_url}
            alt={portfolio.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-secondary via-muted to-secondary/60 flex items-center justify-center">
            <span className="text-5xl text-muted-foreground/30 font-extralight">{portfolio.category || '✦'}</span>
          </div>
        )}
        {/* Gradient fade-out at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Title + Meta */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
        >
          {/* Category badge */}
          {portfolio.category && (
            <span className="inline-block text-xs font-medium uppercase tracking-widest text-primary mb-5">
              {portfolio.category}
            </span>
          )}

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight mb-6">
            {portfolio.title}
          </h1>

          {portfolio.description && (
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 max-w-2xl">
              {portfolio.description}
            </p>
          )}

          {/* Stats + Links */}
          <div className="flex flex-wrap items-center gap-6 pb-10 border-b border-border">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Eye size={15} />
              <span>{portfolio.views.toLocaleString()} views</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Heart size={15} />
              <span>{portfolio.likes.toLocaleString()} appreciations</span>
            </div>
            <span className="text-sm text-muted-foreground">{formattedDate}</span>

            {portfolio.project_url && (
              <a
                href={portfolio.project_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto flex items-center gap-1.5 text-sm font-medium text-primary hover:opacity-70 transition-opacity"
              >
                Visit Project <ExternalLink size={13} />
              </a>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-8">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/${locale}/explore?tag=${tag}`}
                  className="flex items-center gap-1.5 text-xs font-medium bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground transition-colors px-3 py-1.5 rounded-full"
                >
                  <Tag size={11} />
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
