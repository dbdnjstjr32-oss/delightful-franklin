'use client'

import { useTranslations } from 'next-intl'
import { motion, useScroll, useMotionValueEvent } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Globe, Upload, User, LayoutDashboard, LogOut } from 'lucide-react'
import { signOut } from '@/features/auth/actions'
import { usePathname, useRouter } from '@/i18n/routing'

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
  const [langOpen, setLangOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { scrollY } = useScroll()
  const pathname = usePathname()
  const router = useRouter()
  const langRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useMotionValueEvent(scrollY, 'change', (latest) => {
    setScrolled(latest > 20)
  })

  // Close the dropdowns on outside click or Escape.
  useEffect(() => {
    if (!langOpen && !menuOpen) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (langRef.current && !langRef.current.contains(target)) setLangOpen(false)
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setLangOpen(false)
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [langOpen, menuOpen])

  const displayName = user?.displayName || user?.username || 'Creator'

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.8)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="text-lg font-semibold tracking-tight text-foreground hover:opacity-70 transition-opacity"
        >
          Showcase
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-8">
          <Link
            href={`/${locale}/explore`}
            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            {t('explore')}
          </Link>
          <Link
            href={`/${locale}/explore?tab=creators`}
            className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
          >
            {t('creators')}
          </Link>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="relative" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-1.5 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors px-2 py-1.5 rounded-md hover:bg-secondary"
              aria-label="Change language"
              aria-expanded={langOpen}
            >
              <Globe size={16} />
              <span className="uppercase text-xs">{locale}</span>
            </button>
            {langOpen && (
              <div className="absolute right-0 top-full mt-2 w-36 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      // Keep the current page; just swap the locale.
                      router.replace(pathname, { locale: l.code })
                      setLangOpen(false)
                    }}
                    className={`block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-secondary ${
                      l.code === locale ? 'text-primary font-medium' : 'text-foreground'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Upload (logged-in only) */}
          {user && (
            <Link
              href={`/${locale}/upload`}
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            >
              <Upload size={14} />
              {t('upload')}
            </Link>
          )}

          {/* Auth area */}
          {user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="w-8 h-8 rounded-full bg-secondary overflow-hidden flex items-center justify-center hover:ring-2 hover:ring-primary/30 transition-all"
                aria-label="Account menu"
                aria-expanded={menuOpen}
              >
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    width={32}
                    height={32}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs font-semibold text-muted-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg py-1 overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-border">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {user.username && (
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                    )}
                  </div>
                  <Link
                    href={`/${locale}/dashboard`}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                  >
                    <LayoutDashboard size={15} />
                    {t('dashboard')}
                  </Link>
                  {user.username && (
                    <Link
                      href={`/${locale}/u/${user.username}`}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                    >
                      <User size={15} />
                      {t('profile')}
                    </Link>
                  )}
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive-foreground hover:bg-secondary transition-colors"
                    >
                      <LogOut size={15} />
                      {t('signOut')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          ) : (
            <Link
              href={`/${locale}/login`}
              className="flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2 rounded-full hover:opacity-80 transition-opacity"
            >
              <User size={14} />
              {t('signIn')}
            </Link>
          )}
        </div>
      </div>
    </motion.header>
  )
}
