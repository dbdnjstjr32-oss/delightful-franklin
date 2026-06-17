import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://showcase.com'
const LOCALES = ['ko', 'en', 'ja', 'es']

// Supabase caps a single select at 1000 rows by default, so the previous
// unpaginated query silently dropped everything past row 1000. Fetch in
// batches with `.range()` so the sitemap stays complete (and memory bounded)
// as the dataset grows.
const PAGE_SIZE = 1000
// Hard ceiling so a runaway table can never blow up the route. Past this you
// should split into multiple sitemaps via `generateSitemaps`.
const MAX_ROWS = 50_000

async function fetchAll<T>(
  query: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const batch = await query(from, from + PAGE_SIZE - 1)
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) break
  }
  return rows
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient()

  const portfolios = await fetchAll<{ id: string; updated_at: string }>(async (from, to) => {
    const { data } = await supabase
      .from('portfolios')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .range(from, to)
    return data ?? []
  })

  const profiles = await fetchAll<{ username: string; updated_at: string }>(async (from, to) => {
    const { data } = await supabase
      .from('profiles')
      .select('username, updated_at')
      .not('username', 'is', null)
      .order('updated_at', { ascending: false })
      .range(from, to)
    return data ?? []
  })

  const staticRoutes: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((l) => [l, `${BASE_URL}/${l}`])),
      },
    },
    {
      url: `${BASE_URL}/${locale}/explore`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
  ])

  const portfolioRoutes: MetadataRoute.Sitemap = portfolios.flatMap((p) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/portfolio/${p.id}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  )

  const profileRoutes: MetadataRoute.Sitemap = profiles.flatMap((p) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/u/${p.username}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  )

  return [...staticRoutes, ...portfolioRoutes, ...profileRoutes]
}
