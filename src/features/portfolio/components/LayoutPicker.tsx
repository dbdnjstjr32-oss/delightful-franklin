'use client'

import { useTranslations } from 'next-intl'
import { Columns2, GalleryVertical, Presentation } from 'lucide-react'
import { LAYOUTS, type Layout } from '@/lib/presentation'

const ICONS: Record<Layout, typeof GalleryVertical> = {
  gallery: GalleryVertical,
  deck: Presentation,
  case_study: Columns2,
}

/** How the work page presents its attachments.
 *
 *  A deck of slides, a set of demo screenshots and a written case study all
 *  want a different page, and the creator is the one who knows which they
 *  made. Purely a rendering choice — switching presets never touches a file.
 */
export function LayoutPicker({
  name,
  value,
  onChange,
}: {
  name: string
  value: Layout
  onChange: (next: Layout) => void
}) {
  const t = useTranslations('work')

  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label={t('layout_label')} className="grid gap-3 sm:grid-cols-3">
        {LAYOUTS.map((key) => {
          const Icon = ICONS[key]
          const active = value === key
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(key)}
              className={`flex flex-col items-start gap-2 rounded-md border p-4 text-left transition-colors ${
                active
                  ? 'border-foreground bg-secondary/60'
                  : 'border-border hover:bg-secondary/40'
              }`}
            >
              <Icon
                size={18}
                aria-hidden
                className={active ? 'text-foreground' : 'text-muted-foreground'}
              />
              <span className="text-sm font-semibold text-foreground">
                {t(`layout_${key}`)}
              </span>
              <span className="text-xs leading-snug text-muted-foreground">
                {t(`layout_${key}_hint`)}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
