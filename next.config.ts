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

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (avatars, uploaded thumbnails)
      ...(supabaseHost
        ? [{ protocol: 'https' as const, hostname: supabaseHost }]
        : [{ protocol: 'https' as const, hostname: '*.supabase.co' }]),
      // Portfolio thumbnails may be hosted anywhere. Tighten this to known
      // hosts if you move to first-party uploads only.
      { protocol: 'https' as const, hostname: '**' },
    ],
  },
};

export default withNextIntl(nextConfig);
