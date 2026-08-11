'use client'

import { useState, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { X } from 'lucide-react'

const MAX_TAGS = 8
const MAX_TAG_LEN = 30

/** Tag entry as chips.
 *
 *  The field was a bare text input the creator had to comma-separate by hand,
 *  with no feedback on how many tags they had or which ones had survived
 *  normalisation. The wire format is unchanged — a comma-joined hidden input —
 *  so `parsePortfolioForm` on the server still reads one `tags` field.
 */
export function TagInput({ name, defaultValue = [] }: { name: string; defaultValue?: string[] }) {
  const t = useTranslations('work')
  const [tags, setTags] = useState<string[]>(() =>
    Array.from(new Set(defaultValue.map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(
      0,
      MAX_TAGS
    )
  )
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const full = tags.length >= MAX_TAGS

  function commit(raw: string) {
    // Pasting "a, b, c" should produce three chips, not one.
    const next = new Set(tags)
    for (const part of raw.split(',')) {
      const tag = part.trim().toLowerCase().slice(0, MAX_TAG_LEN)
      if (tag && next.size < MAX_TAGS) next.add(tag)
    }
    setTags(Array.from(next))
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      // Enter would otherwise submit the whole form mid-tag.
      e.preventDefault()
      if (draft.trim()) commit(draft)
      return
    }
    if (e.key === 'Backspace' && !draft && tags.length) {
      setTags(tags.slice(0, -1))
    }
  }

  return (
    <>
      <input type="hidden" name={name} value={tags.join(', ')} />
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-12 w-full flex-wrap items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-2 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50"
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-background px-3 py-1 text-sm font-medium text-foreground"
          >
            {tag}
            <button
              type="button"
              aria-label={t('tag_remove_aria', { tag })}
              onClick={() => setTags(tags.filter((t) => t !== tag))}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <X size={12} aria-hidden />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          maxLength={MAX_TAG_LEN}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && commit(draft)}
          placeholder={full ? t('tag_full', { max: MAX_TAGS }) : t('tag_placeholder')}
          aria-label={t('tag_add_aria')}
          className="h-8 min-w-[10rem] flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
      </div>
    </>
  )
}
