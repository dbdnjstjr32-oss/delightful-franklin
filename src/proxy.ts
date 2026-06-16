import { type NextRequest } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1. Let next-intl resolve locale routing and produce the response (it may
  //    rewrite or redirect, and it sets its own locale cookie).
  const response = intlMiddleware(request)

  // 2. Refresh the Supabase session and apply auth guards, writing any cookies
  //    onto the SAME response so nothing is lost.
  return updateSession(request, response)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
