'use client'

import Image from 'next/image'
import Link from 'next/link'
import { FolderOpen, ArrowRight } from 'lucide-react'

interface Creator {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  portfolios: { count: number }[]
}

export function CreatorRow({ creator, locale }: { creator: Creator; locale: string }) {
  const name = creator.display_name || creator.username || 'Creator'
  const count = creator.portfolios?.[0]?.count ?? 0

  return (
    <Link
      href={`/${locale}/u/${creator.username}`}
      className="group flex items-center gap-5 p-4 rounded-2xl bg-card border border-border hover:border-primary/20 hover:shadow-sm transition-all duration-200"
    >
      {/* Avatar */}
      <div className="w-12 h-12 rounded-full bg-secondary overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
        {creator.avatar_url ? (
          <Image
            src={creator.avatar_url}
            alt={name}
            width={48}
            height={48}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-base font-bold text-muted-foreground">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {name}
        </p>
        <p className="text-xs text-muted-foreground truncate">@{creator.username}</p>
        {creator.bio && (
          <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">{creator.bio}</p>
        )}
      </div>

      {/* Project count */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
        <FolderOpen size={13} />
        <span>{count} project{count !== 1 ? 's' : ''}</span>
      </div>

      {/* Arrow */}
      <ArrowRight
        size={15}
        className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0"
      />
    </Link>
  )
}
