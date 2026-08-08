'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Globe } from 'lucide-react'
import { useReveal } from '@/lib/motion'

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

/** Byline block closing the detail page. */
export function CreatorCard({ profile, locale }: Props) {
  const t = useTranslations('profile')
  const reveal = useReveal()

  if (!profile) return null

  const name = profile.display_name || profile.username || 'Creator'
  let websiteHost: string | null = null
  if (profile.website) {
    try {
      websiteHost = new URL(profile.website).hostname
    } catch {
      websiteHost = null
    }
  }

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[110rem] px-5 py-20 sm:px-8">
        <motion.div {...reveal()} className="grid gap-10 md:grid-cols-[16rem_1fr]">
          <h2 className="overline text-muted-foreground">Creator</h2>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
            <Link
              href={`/${locale}/u/${profile.username}`}
              className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
            >
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={80}
                  height={80}
                  className="size-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-muted-foreground">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <Link
                href={`/${locale}/u/${profile.username}`}
                className="font-display text-3xl font-extrabold tracking-tightest text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
              >
                {name}
              </Link>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>

              {profile.bio && (
                <p className="mt-5 max-w-xl leading-relaxed text-foreground/80">{profile.bio}</p>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-5">
                {profile.website && websiteHost && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Globe size={14} aria-hidden />
                    {websiteHost}
                  </a>
                )}
                <Link
                  href={`/${locale}/u/${profile.username}`}
                  className="group inline-flex items-center gap-1 text-sm font-semibold text-foreground"
                >
                  {t('view_all_work')}
                  <ArrowUpRight
                    size={15}
                    aria-hidden
                    className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
