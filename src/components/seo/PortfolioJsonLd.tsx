import { safeJsonLd } from './safe-json-ld'

interface PortfolioJsonLdProps {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  created_at: string
  locale: string
  creator: {
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function PortfolioJsonLd({
  id,
  title,
  description,
  thumbnail_url,
  created_at,
  locale,
  creator,
}: PortfolioJsonLdProps) {
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'
  const url = `${BASE_URL}/${locale}/portfolio/${id}`

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: title,
    description: description ?? undefined,
    url,
    dateCreated: created_at,
    image: thumbnail_url ?? undefined,
    author: creator
      ? {
          '@type': 'Person',
          name: creator.display_name || creator.username,
          url: `${BASE_URL}/${locale}/u/${creator.username}`,
          image: creator.avatar_url ?? undefined,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Showcase',
      url: BASE_URL,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
    />
  )
}
