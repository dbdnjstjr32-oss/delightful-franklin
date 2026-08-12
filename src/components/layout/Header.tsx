'use client'

import { useTranslations } from 'next-intl'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Globe,
  Upload,
  User,
  LayoutDashboard,
  LogOut,
  Menu,
  Check,
  Settings,
} from 'lucide-react'
import { signOut } from '@/features/auth/actions'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { ThemeToggle } from '@/components/theme/ThemeToggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const LOCALES = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'es', label: 'Español' },
]

export interface HeaderUser {
  username: string | null
  displayName: string | null
  avatarUrl: string | null
}

export function Header({ locale, user }: { locale: string; user: HeaderUser | null }) {
  const t = useTranslations('nav')
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { scrollY } = useScroll()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  // Swap only the locale segment of the current path (locale-prefix aware), so
  // switching never stacks locales (e.g. /en + ja must become /ja, not /ja/en).
  function switchLocale(code: string) {
    const segments = pathname.split('/')
    const rest = routing.locales.includes(segments[1] as (typeof routing.locales)[number])
      ? '/' + segments.slice(2).join('/')
      : pathname
    const base = rest === '/' ? `/${code}` : `/${code}${rest}`
    const qs = searchParams.toString()
    router.push(qs ? `${base}?${qs}` : base)
  }

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  const displayName = user?.displayName || user?.username || 'Creator'
  const navLinks = [
    { href: `/${locale}/explore`, label: t('explore') },
    { href: `/${locale}/explore?tab=creators`, label: t('creators') },
  ]

  return (
    <motion.header
      data-scrolled={scrolled}
      className="fixed top-0 right-0 left-0 z-50 border-b border-transparent transition-colors duration-300 data-[scrolled=true]:border-border data-[scrolled=true]:bg-background/85 data-[scrolled=true]:backdrop-blur-xl data-[scrolled=true]:supports-backdrop-filter:bg-background/70"
    >
      <div className="mx-auto flex h-16 max-w-[110rem] items-center justify-between gap-4 px-5 sm:px-8">
        {/* Wordmark — the accessible name stays exactly "Showcase". */}
        <Link
          href={`/${locale}`}
          className="group flex items-baseline gap-1 font-display text-xl font-extrabold tracking-tightest text-foreground"
        >
          Showcase
          <span
            aria-hidden
            className="size-1.5 rounded-full bg-primary transition-transform duration-200 group-hover:scale-150"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="overline text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <ThemeToggle label={t('theme')} />

          {/* Language */}
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Change language"
              className="inline-flex size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Globe size={16} aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-40">
              {LOCALES.map((l) => (
                <DropdownMenuItem
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  className="justify-between py-2"
                >
                  {l.label}
                  {l.code === locale && <Check size={14} aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {user && (
            <Link
              href={`/${locale}/upload`}
              className="hidden items-center gap-1.5 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85 sm:flex"
            >
              <Upload size={14} aria-hidden />
              {t('upload')}
            </Link>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className="flex size-11 items-center justify-center rounded-full"
              >
                <span className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border transition-all hover:ring-2 hover:ring-primary">
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto min-w-52">
                <div className="px-1.5 py-2">
                  <p className="truncate text-sm font-medium">{displayName}</p>
                  {user.username && (
                    <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                  )}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="py-2"
                  render={<Link href={`/${locale}/dashboard`} />}
                >
                  <LayoutDashboard size={15} aria-hidden />
                  {t('dashboard')}
                </DropdownMenuItem>
                {/* No username means the account came from OAuth and has not
                    been through onboarding — there is no public profile to
                    link to yet, so point at the form that creates one rather
                    than hiding the entry and leaving no way through. */}
                <DropdownMenuItem
                  className="py-2"
                  render={
                    <Link
                      href={
                        user.username
                          ? `/${locale}/u/${user.username}`
                          : `/${locale}/onboarding`
                      }
                    />
                  }
                >
                  <User size={15} aria-hidden />
                  {user.username ? t('profile') : t('completeProfile')}
                </DropdownMenuItem>
                <DropdownMenuItem className="py-2" render={<Link href={`/${locale}/settings`} />}>
                  <Settings size={15} aria-hidden />
                  {t('settings')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Kept as a form submit: signOut() resolves the redirect
                    locale from the request referer. */}
                <form action={signOut}>
                  <DropdownMenuItem
                    variant="destructive"
                    className="w-full py-2"
                    render={<button type="submit" />}
                  >
                    <LogOut size={15} aria-hidden />
                    {t('signOut')}
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="hidden items-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85 sm:flex"
            >
              {t('signIn')}
            </Link>
          )}

          {/* Mobile menu — the desktop nav is hidden below md, so this is the
              only way to reach Explore/Creators on a phone. */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label={t('menu')}
              className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary md:hidden"
            >
              <Menu size={18} aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="w-full max-w-xs">
              <SheetHeader>
                <SheetTitle className="font-display text-lg tracking-tightest">
                  {t('menu')}
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-2">
                {navLinks.map((link) => (
                  <SheetClose
                    key={link.href}
                    render={<Link href={link.href} />}
                    className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                  >
                    {link.label}
                  </SheetClose>
                ))}
                {user ? (
                  <>
                    <SheetClose
                      render={<Link href={`/${locale}/upload`} />}
                      className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                    >
                      {t('upload')}
                    </SheetClose>
                    <SheetClose
                      render={<Link href={`/${locale}/dashboard`} />}
                      className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                    >
                      {t('dashboard')}
                    </SheetClose>
                    <SheetClose
                      render={
                        <Link
                          href={
                            user.username
                              ? `/${locale}/u/${user.username}`
                              : `/${locale}/onboarding`
                          }
                        />
                      }
                      className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                    >
                      {user.username ? t('profile') : t('completeProfile')}
                    </SheetClose>
                    <SheetClose
                      render={<Link href={`/${locale}/settings`} />}
                      className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                    >
                      {t('settings')}
                    </SheetClose>
                  </>
                ) : (
                  <SheetClose
                    render={<Link href={`/${locale}/login`} />}
                    className="rounded-md px-3 py-3 font-display text-2xl tracking-tightest text-foreground transition-colors hover:bg-secondary"
                  >
                    {t('signIn')}
                  </SheetClose>
                )}
              </nav>
              <div className="mt-auto border-t border-border px-4 py-4">
                <p className="overline mb-3 text-muted-foreground">Language</p>
                <div className="flex flex-wrap gap-2">
                  {LOCALES.map((l) => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        switchLocale(l.code)
                        setMobileOpen(false)
                      }}
                      aria-current={l.code === locale}
                      className={`rounded-full px-3 py-2 text-sm transition-colors ${
                        l.code === locale
                          ? 'bg-foreground text-background'
                          : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </motion.header>
  )
}
