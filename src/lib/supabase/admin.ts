import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. It BYPASSES Row Level Security, so use it only
 * in trusted server-side code and never expose the key to the browser.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` — a server-only env var (NOT prefixed
 * with NEXT_PUBLIC_). Throws if it isn't configured.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new Error(
      'Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    )
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
