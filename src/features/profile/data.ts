import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { Portfolio } from '@/components/portfolio/PortfolioCard'

/** Cached so generateMetadata and the page share a single profile lookup. */
export const getProfileByUsername = cache(async (username: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, website, created_at')
    .eq('username', username)
    .maybeSingle()

  return data
})

/** Grid data only — narrowed columns instead of select('*') to avoid pulling
 *  full portfolio bodies just to render cards. */
export const getProfilePortfolios = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portfolios')
    .select('id, title, thumbnail_url, category, views, likes, portfolio_tags(tags(name))')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return (data ?? []) as unknown as Portfolio[]
})

/** Totals computed in the DB via RPC instead of fetching every row and summing
 *  in app memory. Falls back to zeros if the RPC isn't installed yet. */
export const getProfileStats = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data } = await supabase.rpc('get_profile_stats', { p_user_id: userId })
  const row = (Array.isArray(data) ? data[0] : data) as
    | { total_views: number; total_likes: number; project_count: number }
    | null

  return {
    totalViews: Number(row?.total_views ?? 0),
    totalAppreciations: Number(row?.total_likes ?? 0),
    projectCount: Number(row?.project_count ?? 0),
  }
})
