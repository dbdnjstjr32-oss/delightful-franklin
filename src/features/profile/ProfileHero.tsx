'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import { Globe } from 'lucide-react'
import { useReveal } from '@/lib/motion'

interface Profile {
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
}

/** Profile masthead.
 *
 *  The previous version printed four fixed skill tags (Design, Branding,
 *  Motion, UI/UX) on every profile and two social icons pointing at `href="#"`
 *  — invented facts about a real person and links that went nowhere. Only
 *  stored fields are rendered here.
 */
export function ProfileHero({ profile }: { profile: Profile }) {
  const name = profile.display_name || profile.username || 'Creator'
  const reveal = useReveal()

  let websiteHost: string | null = null
  if (profile.website) {
    try {
      websiteHost = new URL(profile.website).hostname
    } catch {
      websiteHost = null
    }
  }

  return (
    <section className="mx-auto max-w-[110rem] px-5 pt-32 pb-14 sm:px-8">
      <motion.div {...reveal()} className="flex flex-col gap-8 sm:flex-row sm:items-end">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border sm:size-36">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt=""
              width={144}
              height={144}
              className="size-full object-cover"
              priority
            />
          ) : (
            <span className="font-display text-5xl font-bold text-muted-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[0.95] tracking-tightest text-foreground">
            {name}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">@{profile.username}</p>

          {profile.bio && (
            <p className="mt-6 max-w-xl leading-relaxed text-foreground/80">{profile.bio}</p>
          )}

          {profile.website && websiteHost && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Globe size={15} aria-hidden />
              {websiteHost}
            </a>
          )}
        </div>
      </motion.div>
    </section>
  )
}
