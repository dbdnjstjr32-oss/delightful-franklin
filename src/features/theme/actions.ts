'use server'

import { cookies } from 'next/headers'
import { THEME_COOKIE, type Theme } from '@/lib/theme'

const ONE_YEAR = 60 * 60 * 24 * 365

/** Persist the chosen theme. The toggle already flipped the class on the
 *  client, so this only has to make the choice survive the next SSR pass. */
export async function setTheme(theme: Theme) {
  const store = await cookies()
  store.set(THEME_COOKIE, theme, {
    path: '/',
    maxAge: ONE_YEAR,
    sameSite: 'lax',
    // Not httpOnly: the pre-hydration script reads it to avoid a flash.
    secure: process.env.NODE_ENV === 'production',
  })
}
