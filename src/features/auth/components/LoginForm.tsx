'use client'

import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { loginWithCredentials, loginWithGoogle } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormError } from '@/components/ui/form-parts'
import { GoogleIcon } from '@/features/auth/components/GoogleIcon'
import Link from 'next/link'
import { useParams } from 'next/navigation'

/** Query-string states the auth callback can redirect back with, mapped to the
 *  message key that explains them. */
const QUERY_ERRORS: Record<string, string> = {
  auth_failed: 'error_auth_failed',
}
const QUERY_NOTICES: Record<string, string> = {
  'confirm-email': 'notice_confirm_email',
}

export function LoginForm({ notice, initialError }: { notice?: string; initialError?: string }) {
  const t = useTranslations('auth')
  const errorKey = initialError ? QUERY_ERRORS[initialError] : undefined
  const noticeKey = notice ? QUERY_NOTICES[notice] : undefined
  const [error, setError] = useState<string | null>(errorKey ? t(errorKey) : null)
  const noticeMessage = noticeKey ? t(noticeKey) : undefined
  const [isPending, startTransition] = useTransition()
  const params = useParams()
  const locale = params.locale as string

  async function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await loginWithCredentials(formData)
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
      <p className="overline text-muted-foreground">{t('signin_kicker')}</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        {t('signin_heading')}
      </h1>

      <form action={handleSubmit} className="mt-10 space-y-5">
        {noticeMessage && (
          <p
            role="status"
            className="rounded-md border border-border bg-secondary px-4 py-3 text-sm font-medium text-foreground"
          >
            {noticeMessage}
          </p>
        )}

        {/* e2e/smoke.spec.ts matches this label on /en/login, so the English
            value of `identifier_label` has to stay verbatim. */}
        <Field label={t('identifier_label')} htmlFor="identifier">
          <Input
            id="identifier"
            name="identifier"
            variant="field"
            placeholder={t('identifier_placeholder')}
            required
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </Field>

        <Field label={t('password_label')} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            variant="field"
            required
            autoComplete="current-password"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </Field>

        {error && <FormError id="login-error">{error}</FormError>}

        <Button type="submit" size="lg" className="h-12 w-full rounded-full text-base font-semibold" disabled={isPending}>
          {isPending ? t('signin_submitting') : t('signin_submit')}
        </Button>

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
        {t('no_account')}{' '}
        <Link
          href={`/${locale}/signup`}
          className="font-semibold text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
        >
          {t('to_signup')}
        </Link>
      </p>
    </div>
  )
}
