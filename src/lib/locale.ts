import 'server-only'
import { headers } from 'next/headers'
import { routing } from '@/i18n/routing'

/** Best-effort locale from the Referer header, defaulting to the app default. */
export async function localeFromReferer(): Promise<string> {
  const referer = (await headers()).get('referer') || ''
  const match = referer.match(new RegExp(`/(${routing.locales.join('|')})(/|$)`))
  return match ? match[1] : routing.defaultLocale
}
