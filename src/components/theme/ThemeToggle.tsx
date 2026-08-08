'use client'

import { useTransition } from 'react'
import { Moon, Sun } from 'lucide-react'
import { setTheme } from '@/features/theme/actions'

/** Flips the theme instantly on the client, then persists the choice.
 *
 *  The current theme is never mirrored into React state: on a first visit the
 *  `.dark` class comes from the pre-hydration script (OS preference), which
 *  React does not know about. Reading it off <html> at click time — and letting
 *  the `dark:` variant swap the icon and label — keeps server and client markup
 *  identical no matter how the class got there.
 */
export function ThemeToggle({ label, className }: { label: string; className?: string }) {
  const [, startTransition] = useTransition()

  function toggle() {
    const nextIsDark = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', nextIsDark)
    startTransition(() => {
      setTheme(nextIsDark ? 'dark' : 'light')
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // A static name, not "switch to dark/light": the current theme lives in a
      // CSS class React never reads, so a state-dependent label could go stale.
      aria-label={label}
      className={
        className ??
        'inline-flex size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-secondary hover:text-foreground'
      }
    >
      <Sun size={16} className="dark:hidden" aria-hidden />
      <Moon size={16} className="hidden dark:block" aria-hidden />
    </button>
  )
}
