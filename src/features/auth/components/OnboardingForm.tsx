'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { updateOnboardingProfile } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormError } from '@/components/ui/form-parts'
import { Camera } from 'lucide-react'

export function OnboardingForm({
  defaultName,
  defaultUsername,
}: {
  defaultName: string
  defaultUsername: string | null
}) {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke the previous object URL whenever the preview changes or the
  // component unmounts, so blob URLs don't leak.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setPreview(URL.createObjectURL(file))
    }
  }

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateOnboardingProfile(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div>
      <p className="overline text-muted-foreground">{t('onboarding_kicker')}</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        {t('onboarding_heading')}
      </h1>
      <p className="mt-5 max-w-sm text-muted-foreground">{t('onboarding_sub')}</p>

      <form action={handleSubmit} className="mt-10 space-y-6">
        <div className="flex items-center gap-5">
          {/* A real button, not a click handler on a div: the avatar picker has
              to be reachable by keyboard. */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t('avatar_aria')}
            className="group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
          >
            {preview ? (
              <Image src={preview} alt="" fill sizes="96px" className="object-cover" unoptimized />
            ) : (
              <Camera size={22} className="text-muted-foreground" aria-hidden />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <Camera size={20} className="text-background" aria-hidden />
            </span>
          </button>
          <p className="text-sm text-muted-foreground">
            {t('avatar_prompt')}
            <br />
            <span className="text-xs">{t('avatar_optional')}</span>
          </p>
        </div>
        <input
          type="file"
          name="avatar"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        <Field label={t('username_label')} htmlFor="username" hint={t('username_hint')}>
          <Input
            id="username"
            name="username"
            variant="field"
            defaultValue={defaultUsername || ''}
            placeholder={t('username_placeholder')}
            required
            pattern="^[a-zA-Z0-9_]{3,20}$"
            aria-invalid={!!error}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </Field>

        <Field label={t('display_name_label')} htmlFor="displayName">
          <Input
            id="displayName"
            name="displayName"
            variant="field"
            defaultValue={defaultName}
            placeholder={t('display_name_placeholder')}
            aria-invalid={!!error}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </Field>

        <Field label={t('bio_label')} htmlFor="bio">
          <Textarea
            id="bio"
            name="bio"
            variant="field"
            className="h-24"
            placeholder={t('bio_placeholder')}
          />
        </Field>

        <Field label={t('website_label')} htmlFor="website">
          <Input
            id="website"
            name="website"
            type="url"
            variant="field"
            placeholder={t('website_placeholder')}
            aria-invalid={!!error}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </Field>

        {error && <FormError id="onboarding-error">{error}</FormError>}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          disabled={isPending}
        >
          {isPending ? t('onboarding_submitting') : t('onboarding_submit')}
        </Button>
      </form>
    </div>
  )
}
