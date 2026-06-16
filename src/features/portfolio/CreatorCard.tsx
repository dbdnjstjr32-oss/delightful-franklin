'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { Globe, ArrowRight } from 'lucide-react'

interface Profile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
}

interface Props {
  profile: Profile | null
  locale: string
}

export function CreatorCard({ profile, locale }: Props) {
  if (!profile) return null

  return (
    <motion.section
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }}
      className="py-20 px-6 border-t border-border"
    >
      <div className="max-w-4xl mx-auto">
        <p className="text-xs font-medium uppercase tracking-widest text-primary mb-10">Creator</p>

        <div className="flex flex-col sm:flex-row items-start gap-8">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden flex-shrink-0 ring-2 ring-border">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || profile.username || ''}
                width={80}
                height={80}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {(profile.display_name || profile.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h3 className="text-xl font-bold tracking-tight mb-0.5">
              {profile.display_name || profile.username}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">@{profile.username}</p>
            {profile.bio && (
              <p className="text-sm text-foreground/80 leading-relaxed max-w-lg mb-5">{profile.bio}</p>
            )}
            <div className="flex items-center gap-4">
              {profile.website && (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Globe size={13} />
                  {new URL(profile.website).hostname}
                </a>
              )}
              <Link
                href={`/${locale}/u/${profile.username}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-70 transition-opacity ml-auto"
              >
                모든 작품 보기 <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  )
}
