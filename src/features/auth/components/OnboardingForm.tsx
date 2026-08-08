'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import Image from 'next/image'
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
      <p className="overline text-muted-foreground">One last step</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        Complete your profile
      </h1>
      <p className="mt-5 max-w-sm text-muted-foreground">
        You can change any of this later.
      </p>

      <form action={handleSubmit} className="mt-10 space-y-6">
        <div className="flex items-center gap-5">
          {/* A real button, not a click handler on a div: the avatar picker has
              to be reachable by keyboard. */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Upload avatar"
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
            Add a profile photo
            <br />
            <span className="text-xs">Optional</span>
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

        <Field label="Username" htmlFor="username" hint="3–20 characters: letters, numbers, underscores.">
          <Input
            id="username"
            name="username"
            variant="field"
            defaultValue={defaultUsername || ''}
            placeholder="e.g. wonseok"
            required
            pattern="^[a-zA-Z0-9_]{3,20}$"
            aria-invalid={!!error}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </Field>

        <Field label="Display Name" htmlFor="displayName">
          <Input
            id="displayName"
            name="displayName"
            variant="field"
            defaultValue={defaultName}
            placeholder="e.g. 원석"
            aria-invalid={!!error}
            aria-describedby={error ? 'onboarding-error' : undefined}
          />
        </Field>

        <Field label="Bio" htmlFor="bio">
          <Textarea
            id="bio"
            name="bio"
            variant="field"
            className="h-24"
            placeholder="e.g. 3D Artist & Motion Designer based in Seoul"
          />
        </Field>

        <Field label="Website or social link" htmlFor="website">
          <Input
            id="website"
            name="website"
            type="url"
            variant="field"
            placeholder="https://instagram.com/…"
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
          {isPending ? 'Saving…' : 'Finish'}
        </Button>
      </form>
    </div>
  )
}
