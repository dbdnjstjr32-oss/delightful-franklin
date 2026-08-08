import { cookies } from 'next/headers'

export const THEME_COOKIE = 'theme'
export type Theme = 'light' | 'dark'

/** Resolve the visitor's stored theme. `null` means "never chosen" — the
 *  pre-hydration script in the root layout then falls back to the OS setting. */
export async function getStoredTheme(): Promise<Theme | null> {
  const value = (await cookies()).get(THEME_COOKIE)?.value
  return value === 'dark' || value === 'light' ? value : null
}
