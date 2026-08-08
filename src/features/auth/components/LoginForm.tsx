'use client'

import { useState, useTransition } from 'react'
import { loginWithCredentials, loginWithGoogle } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormError } from '@/components/ui/form-parts'
import { GoogleIcon } from '@/features/auth/components/GoogleIcon'
import Link from 'next/link'
import { useParams } from 'next/navigation'

const QUERY_ERRORS: Record<string, string> = {
  auth_failed: 'Sign-in failed. Please try again.',
}
const QUERY_NOTICES: Record<string, string> = {
  'confirm-email': 'Check your email to confirm your account, then sign in.',
}

export function LoginForm({ notice, initialError }: { notice?: string; initialError?: string }) {
  const [error, setError] = useState<string | null>(
    initialError ? QUERY_ERRORS[initialError] ?? null : null
  )
  const noticeMessage = notice ? QUERY_NOTICES[notice] : undefined
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
      <p className="overline text-muted-foreground">Sign in</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        Welcome back
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

        {/* The label text is what the e2e spec matches on — keep it verbatim. */}
        <Field label="Username or Email" htmlFor="identifier">
          <Input
            id="identifier"
            name="identifier"
            variant="field"
            placeholder="wonseok or name@example.com"
            required
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'login-error' : undefined}
          />
        </Field>

        <Field label="Password" htmlFor="password">
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
          {isPending ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="relative py-2">
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <span className="relative mx-auto block w-fit bg-background px-3 text-xs text-muted-foreground">
            or
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
          Google
        </Button>
      </form>

      <p className="mt-10 text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href={`/${locale}/signup`}
          className="font-semibold text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
