'use client'

import { useOptimistic, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { setPortfolioStatus } from '@/features/portfolio/actions'

/** Publish / unpublish in place.
 *
 *  Optimistic because the round-trip revalidates four routes; waiting for that
 *  before the label flips makes a one-click action feel broken. A failure
 *  reverts with the transition and says why.
 */
export function StatusToggle({
  id,
  title,
  status,
  compact = false,
}: {
  id: string
  title: string
  status: 'draft' | 'published'
  compact?: boolean
}) {
  const t = useTranslations('studio')
  const [isPending, startTransition] = useTransition()
  const [shown, setShown] = useOptimistic(status)

  const next = shown === 'published' ? 'draft' : 'published'
  const label = shown === 'published' ? t('unpublish') : t('publish')
  const ariaLabel =
    shown === 'published' ? t('unpublish_aria', { title }) : t('publish_aria', { title })
  const Icon = shown === 'published' ? EyeOff : Eye

  function toggle() {
    startTransition(async () => {
      setShown(next)
      const formData = new FormData()
      formData.set('id', id)
      formData.set('status', next)
      const result = await setPortfolioStatus(formData)
      if (result?.error) {
        toast.error(result.error)
        return
      }
      toast.success(
        next === 'published' ? t('toast_published', { title }) : t('toast_drafted', { title })
      )
    })
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={ariaLabel}
        className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      >
        <Icon size={16} aria-hidden />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50"
    >
      <Icon size={13} aria-hidden />
      {label}
    </button>
  )
}
