'use client'

import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

interface Creator {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  portfolios: { count: number }[]
}

export function CreatorRow({ creator, locale }: { creator: Creator; locale: string }) {
  const t = useTranslations('sections')
  const name = creator.display_name || creator.username || 'Creator'
  const count = creator.portfolios?.[0]?.count ?? 0

  return (
    <Link
      href={`/${locale}/u/${creator.username}`}
      className="group flex items-center gap-4 py-5 transition-colors hover:bg-secondary/60 sm:gap-6"
    >
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
          {creator.bio || `@${creator.username}`}
        </span>
      </span>

      <span className="hidden shrink-0 text-sm text-muted-foreground sm:block">
        {t('work_count', { count })}
      </span>

      <ArrowUpRight
        size={18}
        aria-hidden
        className="shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
      />
    </Link>
  )
}
