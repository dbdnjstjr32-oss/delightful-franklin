'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { updateProfile } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormError } from '@/components/ui/form-parts'

type Profile = {
  username: string | null
  display_name: string | null
  bio: string | null
  website: string | null
  avatar_url: string | null
}

/** Editing an existing profile.
 *
 *  Separate from OnboardingForm on purpose: onboarding is a one-time funnel
 *  that ends by moving the user on, whereas this is a settings screen you can
 *  return to, so it fills every field from what is saved and stays put after a
 *  save. Both post to the same columns.
 */
export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (result && 'error' in result) {
        setError(result.error)
        return
      }
      toast.success(t('settings_saved'))
    })
  }

  const shownAvatar = preview ?? profile.avatar_url

  return (
    <form action={handleSubmit} className="mt-10 space-y-6">
      <div className="flex items-center gap-5">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={t('avatar_aria')}
          className="group relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary ring-1 ring-border"
        >
          {shownAvatar ? (
            <Image src={shownAvatar} alt="" fill sizes="96px" className="object-cover" unoptimized />
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
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) setPreview(URL.createObjectURL(file))
        }}
      />

      <Field label={t('username_label')} htmlFor="username" hint={t('username_hint')}>
        <Input
          id="username"
          name="username"
          variant="field"
          defaultValue={profile.username ?? ''}
          placeholder={t('username_placeholder')}
          required
          pattern="^[a-zA-Z0-9_]{3,20}$"
          aria-invalid={!!error}
          aria-describedby={error ? 'profile-error' : undefined}
        />
      </Field>

      <Field label={t('display_name_label')} htmlFor="displayName">
        <Input
          id="displayName"
          name="displayName"
          variant="field"
          defaultValue={profile.display_name ?? ''}
          placeholder={t('display_name_placeholder')}
        />
      </Field>

      <Field label={t('bio_label')} htmlFor="bio">
        <Textarea
          id="bio"
          name="bio"
          variant="field"
          className="h-24"
          defaultValue={profile.bio ?? ''}
          placeholder={t('bio_placeholder')}
        />
      </Field>

      <Field label={t('website_label')} htmlFor="website">
        <Input
          id="website"
          name="website"
          type="url"
          variant="field"
          defaultValue={profile.website ?? ''}
          placeholder={t('website_placeholder')}
        />
      </Field>

      {error && <FormError id="profile-error">{error}</FormError>}

      <Button
        type="submit"
        size="lg"
        className="h-12 rounded-full px-8 text-base font-semibold"
        disabled={isPending}
      >
        {isPending ? t('onboarding_submitting') : t('settings_save')}
      </Button>
    </form>
  )
}
