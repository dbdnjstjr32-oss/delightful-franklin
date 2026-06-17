import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ProfileHero } from '@/features/profile/ProfileHero'
import { ProfileStats } from '@/features/profile/ProfileStats'
import { ProfilePortfolioGrid } from '@/features/profile/ProfilePortfolioGrid'
import { ProfileJsonLd } from '@/components/seo/ProfileJsonLd'
import {
  getProfileByUsername,
  getProfilePortfolios,
  getProfileStats,
} from '@/features/profile/data'

type Props = { params: Promise<{ locale: string; username: string }> }

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'
const LOCALES = ['ko', 'en', 'ja', 'es']

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, username } = await params
  const profile = await getProfileByUsername(username)

  if (!profile) return { title: 'Not Found' }

  const name = profile.display_name || username

  return {
    title: `${name} — Showcase`,
    description: profile.bio || `${name}'s portfolio on Showcase.`,
    alternates: {
      canonical: `${BASE_URL}/${locale}/u/${username}`,
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${BASE_URL}/${l}/u/${username}`])
      ),
    },
    openGraph: {
      title: `${name} — Showcase`,
      description: profile.bio || `${name}'s creative portfolio`,
      images: profile.avatar_url ? [{ url: profile.avatar_url, width: 400, height: 400 }] : [],
      type: 'profile',
      url: `${BASE_URL}/${locale}/u/${username}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} — Showcase`,
      description: profile.bio || '',
      images: profile.avatar_url ? [profile.avatar_url] : [],
    },
  }
}

export default async function UserProfilePage({ params }: Props) {
  const { locale, username } = await params

  const profile = await getProfileByUsername(username)
  if (!profile) notFound()

  const [portfolios, stats] = await Promise.all([
    getProfilePortfolios(profile.id),
    getProfileStats(profile.id),
  ])

  return (
    <div className="pt-16">
      <ProfileJsonLd
        username={username}
        display_name={profile.display_name}
        bio={profile.bio}
        avatar_url={profile.avatar_url}
        website={profile.website}
        locale={locale}
        projectCount={stats.projectCount}
      />
      <ProfileHero profile={profile} />
      <ProfileStats
        totalViews={stats.totalViews}
        totalAppreciations={stats.totalAppreciations}
        projectCount={stats.projectCount}
      />
      <ProfilePortfolioGrid portfolios={portfolios} locale={locale} username={username} />
    </div>
  )
}
