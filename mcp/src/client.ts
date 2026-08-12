import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const SUPABASE_URL = process.env.SHOWCASE_SUPABASE_URL ?? ''
const ANON_KEY = process.env.SHOWCASE_SUPABASE_ANON_KEY ?? ''
const SEED_REFRESH_TOKEN = process.env.SHOWCASE_REFRESH_TOKEN ?? ''

/** Where the rotated refresh token is kept between runs.
 *
 *  Supabase rotates refresh tokens: every refresh returns a new one and
 *  invalidates the old after a short reuse window. A token pinned in an env var
 *  would therefore work exactly once. So the env var is only a *seed* — the
 *  live token lives here, the way CLI tools keep credentials, and is rewritten
 *  after each refresh. */
const CREDENTIALS_PATH =
  process.env.SHOWCASE_CREDENTIALS_PATH ?? join(homedir(), '.showcase-mcp', 'credentials.json')

export class ConfigError extends Error {}

export function assertConfigured(): void {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new ConfigError(
      'Missing configuration. Set SHOWCASE_SUPABASE_URL and SHOWCASE_SUPABASE_ANON_KEY. ' +
        'Both are public values — the anon key is safe to share and RLS is what protects the data.'
    )
  }
}

/** Anonymous client. Sees exactly what a logged-out visitor sees: published
 *  works only, because that is what the RLS policies allow. */
export function publicClient(): SupabaseClient {
  assertConfigured()
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function readStoredToken(): string {
  try {
    const raw = readFileSync(CREDENTIALS_PATH, 'utf8')
    const parsed = JSON.parse(raw) as { refresh_token?: unknown }
    return typeof parsed.refresh_token === 'string' ? parsed.refresh_token : ''
  } catch {
    // No credentials yet, or unreadable — fall back to the seed.
    return ''
  }
}

function storeToken(refreshToken: string): void {
  try {
    mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true })
    writeFileSync(CREDENTIALS_PATH, JSON.stringify({ refresh_token: refreshToken }, null, 2), {
      mode: 0o600,
    })
    // mkdir/writeFile respect umask, so set it explicitly after the fact too.
    chmodSync(CREDENTIALS_PATH, 0o600)
  } catch (error) {
    // Not fatal for this run — the session in memory still works. But say so,
    // because the next run will fall back to a seed token that has since been
    // rotated away and will fail to authenticate.
    process.stderr.write(
      `[showcase-mcp] could not persist the rotated refresh token to ${CREDENTIALS_PATH}: ` +
        `${error instanceof Error ? error.message : String(error)}\n`
    )
  }
}

let cached: { client: SupabaseClient; userId: string; expiresAt: number } | null = null

/** Client acting as the configured creator.
 *
 *  Authenticates as a real user rather than using a service-role key, so every
 *  query is subject to the same RLS policies as the browser. A bug here can
 *  therefore never reach another user's data.
 */
export async function authedClient(): Promise<{ client: SupabaseClient; userId: string }> {
  assertConfigured()

  const nowSeconds = Math.floor(Date.now() / 1000)
  // Refresh a minute early rather than racing the expiry.
  if (cached && cached.expiresAt - 60 > nowSeconds) {
    return { client: cached.client, userId: cached.userId }
  }

  const refreshToken = readStoredToken() || SEED_REFRESH_TOKEN
  if (!refreshToken) {
    throw new ConfigError(
      'This tool needs an account. Set SHOWCASE_REFRESH_TOKEN to the token from ' +
        'Settings → Claude / MCP on the site, then retry. Read-only tools work without it.'
    )
  }

  const client = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken })
  if (error || !data.session || !data.user) {
    throw new ConfigError(
      `Could not sign in with the stored token: ${error?.message ?? 'no session returned'}. ` +
        `Get a fresh one from Settings → Claude / MCP. If you have used this token elsewhere ` +
        `since, it has been rotated away and a new one is required.`
    )
  }

  if (data.session.refresh_token && data.session.refresh_token !== refreshToken) {
    storeToken(data.session.refresh_token)
  }

  cached = {
    client,
    userId: data.user.id,
    expiresAt: data.session.expires_at ?? nowSeconds + 3600,
  }
  return { client, userId: data.user.id }
}

export const siteUrl = (process.env.SHOWCASE_SITE_URL ?? 'https://delightful-franklin.vercel.app')
  .replace(/\/$/, '')
