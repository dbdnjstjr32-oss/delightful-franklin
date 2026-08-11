'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormError } from '@/components/ui/form-parts'
import { CATEGORIES } from '@/lib/categories'
import { CoverPicker } from './CoverPicker'
import { AssetUploader } from './AssetUploader'
import { TagInput } from './TagInput'
import { LayoutPicker } from './LayoutPicker'
import type { UploadedAsset } from '@/lib/uploads'
import { parseLayout, type Layout, type Ratio } from '@/lib/presentation'

const MAX_DESCRIPTION = 2000

export type PortfolioFormDefaults = {
  id?: string
  title?: string
  description?: string | null
  category?: string | null
  project_url?: string | null
  thumbnail_url?: string | null
  tags?: string[]
  status?: 'draft' | 'published'
  assets?: UploadedAsset[]
  layout?: string | null
  thumbnail_ratio?: string | null
  thumbnail_width?: number | null
  thumbnail_height?: number | null
}

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  userId: string
  defaults?: PortfolioFormDefaults
}

export function PortfolioForm({ action, userId, defaults }: Props) {
  const t = useTranslations('work')
  const tc = useTranslations('categories')
  const tCommon = useTranslations('common')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [described, setDescribed] = useState(defaults?.description?.length ?? 0)
  const [layout, setLayout] = useState<Layout>(parseLayout(defaults?.layout))
  const formRef = useRef<HTMLFormElement>(null)
  const statusRef = useRef<HTMLInputElement>(null)

  const isPublished = defaults?.status === 'published'
  const editing = !!defaults?.id

  function handleSubmit(formData: FormData) {
    setError(null)

    // The cover and the attachments upload on selection, not on submit. If one
    // is still in flight its metadata is not in the form yet, so saving now
    // would quietly drop the file the creator is watching upload.
    if (formData.get('cover_pending') || formData.get('assets_pending')) {
      setError(t('upload_in_progress'))
      return
    }

    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  /** Both buttons submit the same form; only the status they stamp differs. */
  function submitAs(status: 'draft' | 'published') {
    if (statusRef.current) statusRef.current.value = status
    formRef.current?.requestSubmit()
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-8">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}
      <input
        ref={statusRef}
        type="hidden"
        name="status"
        defaultValue={defaults?.status ?? 'published'}
      />

      <CoverPicker
        userId={userId}
        defaultUrl={defaults?.thumbnail_url ?? null}
        defaultRatio={(defaults?.thumbnail_ratio as Ratio | null) ?? null}
        defaultWidth={defaults?.thumbnail_width ?? null}
        defaultHeight={defaults?.thumbnail_height ?? null}
      />

      <Field label={t('title_label')} htmlFor="title">
        <Input
          id="title"
          name="title"
          variant="field"
          required
          maxLength={120}
          defaultValue={defaults?.title ?? ''}
          placeholder={t('title_placeholder')}
          aria-invalid={!!error}
          aria-describedby={error ? 'portfolio-error' : undefined}
        />
      </Field>

      <Field label={t('category_label')} htmlFor="category">
        <select
          id="category"
          name="category"
          required
          defaultValue={defaults?.category ?? ''}
          className="h-12 w-full rounded-md border border-input bg-secondary/50 px-4 text-base text-foreground"
        >
          <option value="" disabled>
            {t('category_placeholder')}
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {tc(c.key)}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label={t('description_label')}
        htmlFor="description"
        hint={t('description_hint', {
          count: described.toLocaleString(),
          max: MAX_DESCRIPTION.toLocaleString(),
        })}
      >
        <Textarea
          id="description"
          name="description"
          variant="field"
          maxLength={MAX_DESCRIPTION}
          defaultValue={defaults?.description ?? ''}
          onChange={(e) => setDescribed(e.target.value.length)}
          placeholder={t('description_placeholder')}
          className="h-36"
        />
      </Field>

      <div className="space-y-2">
        <span className="overline block text-muted-foreground">{t('files_label')}</span>
        <p className="text-sm text-muted-foreground">{t('files_help')}</p>
        <AssetUploader userId={userId} defaultAssets={defaults?.assets ?? []} />
      </div>

      <div className="space-y-3">
        <span className="overline block text-muted-foreground">{t('layout_label')}</span>
        <p className="text-sm text-muted-foreground">{t('layout_help')}</p>
        <LayoutPicker name="layout" value={layout} onChange={setLayout} />
      </div>

      <Field label={t('link_label')} htmlFor="project_url" hint={tCommon('optional')}>
        <Input
          id="project_url"
          name="project_url"
          type="url"
          variant="field"
          defaultValue={defaults?.project_url ?? ''}
          placeholder="https://…"
        />
      </Field>

      <Field label={t('tags_label')} htmlFor="tags" hint={t('tags_hint')}>
        <TagInput name="tags" defaultValue={defaults?.tags ?? []} />
      </Field>

      {error && <FormError id="portfolio-error">{error}</FormError>}

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <Button
          type="button"
          size="lg"
          disabled={isPending}
          onClick={() => submitAs('published')}
          className="h-12 flex-1 rounded-full text-base font-semibold"
        >
          {isPending ? t('saving') : isPublished ? t('save_changes') : t('publish')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          disabled={isPending}
          onClick={() => submitAs('draft')}
          className="h-12 rounded-full px-6 text-base font-semibold sm:flex-none"
        >
          {isPublished ? t('unpublish') : editing ? t('keep_draft') : t('save_draft')}
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">{t('drafts_note')}</p>
    </form>
  )
}
