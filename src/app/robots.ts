import { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Routes are locale-prefixed (e.g. /ko/dashboard), so the disallow
        // patterns use a wildcard segment to match every locale.
        disallow: ['/*/dashboard', '/*/onboarding', '/*/auth/', '/api/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
