import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

// Supabase project host (e.g. abcd.supabase.co) for stored avatars/thumbnails.
const supabaseHost = (() => {
  try {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
      : undefined
  } catch {
    return undefined
  }
})()

// Static security headers applied to every response. The Content-Security-Policy
// is set per-request in proxy.ts (it needs a fresh nonce), so it is intentionally
// not duplicated here.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
]

const nextConfig: NextConfig = {
  images: {
    // First-party uploads only — cover images/avatars live in Supabase Storage.
    // The previous '**' wildcard turned the image optimizer into an open proxy.
    remotePatterns: supabaseHost
      ? [{ protocol: 'https', hostname: supabaseHost }]
      : [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
};

export default withNextIntl(nextConfig);
