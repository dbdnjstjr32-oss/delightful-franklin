'use client'

import { useState, useTransition } from 'react'
import { signup, loginWithGoogle } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FormError } from '@/components/ui/form-parts'
import { GoogleIcon } from '@/features/auth/components/GoogleIcon'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const params = useParams()
  const locale = params.locale as string

  async function handleSubmit(formData: FormData) {
    setError(null)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
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
      <p className="overline text-muted-foreground">Sign up</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest text-foreground sm:text-6xl">
        Create an account
      </h1>
      <p className="mt-5 max-w-sm text-muted-foreground">
        Publish your work and get discovered.
      </p>

      <form action={handleSubmit} className="mt-10 space-y-5">
        <Field label="Username" htmlFor="username" hint="3–20 characters: letters, numbers, underscores.">
          <Input
            id="username"
            name="username"
            variant="field"
            placeholder="e.g. wonseok"
            required
            pattern="^[a-zA-Z0-9_]{3,20}$"
            autoComplete="username"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <Field label="Display Name" htmlFor="displayName">
          <Input
            id="displayName"
            name="displayName"
            variant="field"
            placeholder="e.g. 원석"
            required
            autoComplete="name"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <Field label="Email Address" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            variant="field"
            placeholder="name@example.com"
            required
            autoComplete="email"
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Password" htmlFor="password">
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
          <Field label="Confirm Password" htmlFor="confirmPassword">
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
          {isPending ? 'Creating account…' : 'Create account'}
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
        Already have an account?{' '}
        <Link
          href={`/${locale}/login`}
          className="font-semibold text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
