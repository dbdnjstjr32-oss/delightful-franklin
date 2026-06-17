import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['ko', 'en', 'ja', 'es'],
  defaultLocale: 'ko',
  localePrefix: 'always',
})

// Locale-aware navigation helpers. `usePathname` returns the path WITHOUT the
// locale prefix, so switching locale can preserve the current page.
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
