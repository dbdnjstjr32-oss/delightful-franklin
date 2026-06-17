import { safeJsonLd } from './safe-json-ld'

interface ProfileJsonLdProps {
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  locale: string
  projectCount: number
}

export function ProfileJsonLd({
  username,
  display_name,
  bio,
  avatar_url,
  website,
  locale,
  projectCount,
}: ProfileJsonLdProps) {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'
  const url = `${BASE_URL}/${locale}/u/${username}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: display_name || username,
    url,
    description: bio ?? undefined,
    image: avatar_url ?? undefined,
    sameAs: website ? [website] : undefined,
    mainEntityOfPage: {
      '@type': 'ProfilePage',
      '@id': url,
    },
    interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/CreateAction',
      userInteractionCount: projectCount,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  )
}
