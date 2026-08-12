'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { signup, loginWithGoogle } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormError } from '@/components/ui/form-parts'
import { GoogleIcon } from '@/features/auth/components/GoogleIcon'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export function SignupForm() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const params = useParams()
  const locale = params.locale as string

  async function handleSubmit(formData: FormData) {
    setError(null)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError(t('passwords_mismatch'))
      return
    }

    startTransition(async () => {
      const result = await signup(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  async function handleGoogleLogin() {
    setError(null)
    startTransition(async () => {
      const result = await loginWithGoogle()
      if (result?.url) {
        window.location.href = result.url
      }
    })
  }

  return (
    <div>
      <p className="overline text-muted-foreground">{t('signup_kicker')}</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        {t('signup_heading')}
      </h1>
      <p className="mt-5 max-w-sm text-muted-foreground">{t('signup_sub')}</p>

      <form action={handleSubmit} className="mt-10 space-y-5">
        <Field label={t('username_label')} htmlFor="username" hint={t('username_hint')}>
          <Input
            id="username"
            name="username"
            variant="field"
            placeholder={t('username_placeholder')}
            required
            pattern="^[a-zA-Z0-9_]{3,20}$"
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <Field label={t('display_name_label')} htmlFor="displayName">
          <Input
            id="displayName"
            name="displayName"
            variant="field"
            placeholder={t('display_name_placeholder')}
            required
            autoComplete="name"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <Field label={t('email_label')} htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            variant="field"
            placeholder={t('email_placeholder')}
            required
            autoComplete="email"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label={t('password_label')} htmlFor="password">
            <Input
              id="password"
              name="password"
              type="password"
              variant="field"
              required
              minLength={6}
              autoComplete="new-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </Field>
          <Field label={t('confirm_password_label')} htmlFor="confirmPassword">
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              variant="field"
              required
              minLength={6}
              autoComplete="new-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'signup-error' : undefined}
            />
          </Field>
        </div>

        {error && <FormError id="signup-error">{error}</FormError>}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-full text-base font-semibold"
          disabled={isPending}
        >
          {isPending ? t('signup_submitting') : t('signup_submit')}
        </Button>
        {/* Set expectations before the confirmation email arrives, not after —
            the default sender is Supabase's shared "noreply" address, which
            reads as unfamiliar or spam-like without warning. */}
        <p className="text-center text-xs text-muted-foreground">{t('signup_email_notice')}</p>

        <div className="relative py-2">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="relative mx-auto block w-fit bg-background px-3 text-xs text-muted-foreground">
            {t('divider_or')}
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="h-12 w-full rounded-full text-base font-medium"
          onClick={handleGoogleLogin}
          disabled={isPending}
        >
          <GoogleIcon className="mr-2 size-5" />
          {t('google')}
        </Button>
      </form>

      <p className="mt-10 text-sm text-muted-foreground">
        {t('have_account')}{' '}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
        >
          {t('to_signin')}
        </Link>
      </p>
    </div>
  )
}
