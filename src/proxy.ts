import { type NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware'
import { updateSession } from '@/lib/supabase/middleware'
import { routing } from '@/i18n/routing'

const intlMiddleware = createMiddleware(routing)

/** Build a strict, nonce-based Content-Security-Policy. Scripts are locked to
 *  the per-request nonce + strict-dynamic (the real XSS boundary); styles allow
 *  inline (framer-motion / Next inject runtime styles and CSP's style controls
 *  add little security). Supabase hosts are allowed for the browser client. */
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development'
  let supabaseHttp = ''
  let supabaseWs = ''
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host
    if (host) {
      supabaseHttp = `https://${host}`
      supabaseWs = `wss://${host}`
    }
  } catch {
    // no-op: env not set at build/analyze time
  }

  const devConnect = isDev ? ' ws://localhost:* http://localhost:*' : ''

  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ''}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' blob: data: ${supabaseHttp}`.trim(),
    `font-src 'self'`,
    `connect-src 'self' ${supabaseHttp} ${supabaseWs}${devConnect}`.trim(),
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join('; ')
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const csp = buildCsp(nonce)

  // Forward the nonce + CSP via request headers so Next applies the nonce to
  // its own scripts during SSR.
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('content-security-policy', csp)

  const intlResponse = intlMiddleware(request)

  // next-intl issued a redirect (e.g. "/" -> "/ko"). No render happens, so the
  // nonce is irrelevant — just attach the CSP header and return it.
  if (intlResponse.headers.get('location')) {
    intlResponse.headers.set('content-security-policy', csp)
    return intlResponse
  }

  // Pass-through: build a response that forwards the nonce request headers,
  // carry over next-intl's locale cookie, attach the CSP, then let Supabase
  // refresh the session on this same response.
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
  response.headers.set('content-security-policy', csp)

  return updateSession(request, response)
}

export const config = {
  matcher: [
    // Exclude API, Next internals, metadata routes (sitemap/robots), and static
    // assets. Without excluding sitemap.xml/robots.txt, next-intl would redirect
    // them to /<locale>/… and crawlers would get a 404.
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
