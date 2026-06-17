'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * Toggle the current user's like on a portfolio. Delegates to the atomic,
 * ownership-agnostic `toggle_like` RPC (SECURITY DEFINER, authenticated only),
 * which inserts/deletes the portfolio_likes row and adjusts portfolios.likes in
 * one transaction. Returns the new liked state.
 */
export async function toggleLike(
  portfolioId: string
): Promise<{ liked: boolean } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase.rpc('toggle_like', { p_portfolio_id: portfolioId })
  if (error) return { error: error.message }

  return { liked: !!data }
}
