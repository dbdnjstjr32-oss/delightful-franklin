import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import { headers } from 'next/headers'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Header, type HeaderUser } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ThemeScript } from "@/components/theme/ThemeScript";
import { Toaster } from "@/components/ui/sonner";
import { createClient } from "@/lib/supabase/server";
import { getStoredTheme } from "@/lib/theme";
import "../globals.css";

// Latin UI/body face. Korean and Japanese glyphs come from the self-hosted
// Pretendard subsets declared in globals.css, not from these.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Display face for headlines — the editorial contrast against Inter body text.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Showcase | Create. Publish. Be Discovered.",
  description: "The home for designers, developers, 3D artists, filmmakers, and every creator in between.",
  openGraph: {
    title: "Showcase",
    description: "The home for creative work.",
    type: "website",
  },
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Ensure that the incoming locale is valid
  if (!routing.locales.includes(locale as 'ko' | 'en' | 'ja' | 'es')) {
    notFound()
  }

  // Seed the request locale from the route segment.
  //
  // Without this, next-intl resolves the locale from the header its middleware
  // adds to the request — and proxy.ts rebuilds the request headers itself (to
  // carry the CSP nonce), so that header never arrives. Every non-Korean route
  // fell back to defaultLocale and served Korean strings under lang="en".
  setRequestLocale(locale)

  const messages = await getMessages()

  // Theme + CSP nonce: the nonce is injected as a request header by proxy.ts.
  const [storedTheme, nonce] = await Promise.all([
    getStoredTheme(),
    headers().then((h) => h.get('x-nonce') ?? undefined),
  ])

  // Resolve the signed-in user so the header can render account state.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let headerUser: HeaderUser | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    headerUser = {
      username: profile?.username ?? null,
      displayName: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    }
  }

  return (
    <html
      lang={locale}
      // The pre-hydration script may add `dark` before React attaches, and the
      // nonce is deliberately not serialised to the client — both are expected
      // server/client differences on this element.
      suppressHydrationWarning
      className={`${inter.variable} ${archivo.variable} h-full antialiased ${
        storedTheme === 'dark' ? 'dark' : ''
      }`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeScript nonce={nonce} hasStoredTheme={storedTheme !== null} />
        <NextIntlClientProvider messages={messages}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-100 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
          >
            Skip to content
          </a>
          <Header locale={locale} user={headerUser} />
          <main id="main" className="flex-1">
            {children}
          </main>
          <Footer locale={locale} />
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
