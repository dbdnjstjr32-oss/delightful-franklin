'use client'

import { useTranslations } from 'next-intl'
import { RATIOS, type Ratio } from '@/lib/presentation'

/** Frame the creator wants a piece shown in.
 *
 *  Display only — the uploaded file is untouched, so a choice made here can be
 *  changed later without re-uploading. A ratio narrower than the image crops
 *  it visually via `object-cover`, which is why the labels read as framing
 *  rather than editing.
 */
export function RatioPicker({
  value,
  onChange,
  size = 'default',
  label,
}: {
  value: Ratio | null
  onChange: (next: Ratio | null) => void
  size?: 'default' | 'compact'
  label?: string
}) {
  const t = useTranslations('work')
  const compact = size === 'compact'

  const options: Array<{ key: Ratio | null; text: string }> = [
    { key: null, text: t('ratio_original') },
    ...RATIOS.map((r) => ({ key: r as Ratio | null, text: r })),
  ]

  return (
    <div
      role="group"
      aria-label={label ?? t('ratio_label')}
      className={`flex flex-wrap items-center gap-1 ${compact ? '' : 'mt-1'}`}
    >
      {options.map((option) => {
        const active = value === option.key
        return (
          <button
            key={option.key ?? 'original'}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.key)}
            className={`rounded-full border transition-colors ${
              compact ? 'h-7 px-2.5 text-[0.7rem]' : 'h-9 px-3 text-xs'
            } font-medium ${
              active
                ? 'border-transparent bg-foreground text-background'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.text}
          </button>
        )
      })}
    </div>
  )
}
