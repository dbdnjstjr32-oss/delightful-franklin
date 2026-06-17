import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Header, type HeaderUser } from "@/components/layout/Header";
import { createClient } from "@/lib/supabase/server";
import "../globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
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

  const messages = await getMessages()

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
    <html lang={locale} className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <NextIntlClientProvider messages={messages}>
          <Header locale={locale} user={headerUser} />
          <main className="flex-1">
            {children}
          </main>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
