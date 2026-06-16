import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Fetch a single portfolio with its creator + tags.
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page component share
 * one DB round-trip per request instead of querying the same row twice.
 */
export const getPortfolioById = cache(async (id: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portfolios')
    .select(
      `*,
       profiles(id, username, display_name, avatar_url, bio, website),
       portfolio_tags(tags(name))`
    )
    .eq('id', id)
    .maybeSingle()

  return data
})
