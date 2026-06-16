import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'

const PROTECTED_ROUTES = ['/dashboard', '/upload', '/settings', '/onboarding']
const AUTH_ROUTES = ['/login', '/signup']

/**
 * Refreshes the Supabase session and enforces auth routing.
 *
 * IMPORTANT: `response` is the response produced by the i18n middleware. We
 * bind Supabase's cookie writes to *that same object* so the refreshed auth
 * cookies survive — returning a different response (as the old code did) threw
 * the Set-Cookie headers away and silently logged users out.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Make refreshed values visible to anything reading the request...
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          // ...and persist them to the browser via the response we return.
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and supabase.auth.getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const segments = pathname.split('/')
  const hasLocale = routing.locales.includes(segments[1] as (typeof routing.locales)[number])
  const localePrefix = hasLocale ? `/${segments[1]}` : `/${routing.defaultLocale}`
  const pathWithoutLocale = hasLocale ? `/${segments.slice(2).join('/')}` : pathname

  const matches = (routes: string[]) =>
    routes.some((r) => pathWithoutLocale === r || pathWithoutLocale.startsWith(`${r}/`))

  // Unauthenticated user hitting a protected route → /login
  if (!user && matches(PROTECTED_ROUTES)) {
    return redirectWithCookies(request, response, `${localePrefix}/login`)
  }

  // Authenticated user hitting /login or /signup → /dashboard
  if (user && matches(AUTH_ROUTES)) {
    return redirectWithCookies(request, response, `${localePrefix}/dashboard`)
  }

  return response
}

/** Build a redirect that carries over the cookies already written to `response`. */
function redirectWithCookies(
  request: NextRequest,
  response: NextResponse,
  pathname: string
): NextResponse {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  const redirect = NextResponse.redirect(url)
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
  return redirect
}
