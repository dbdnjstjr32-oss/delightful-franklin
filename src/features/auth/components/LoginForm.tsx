'use client'

import { useState, useTransition } from 'react'
import { loginWithCredentials, loginWithGoogle } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader className="space-y-2 text-center pb-8 pt-8">
        <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold">✦</span>
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
        <CardDescription className="text-muted-foreground text-sm px-4">
          Enter your email or username to sign in to your account
        </CardDescription>
      </CardHeader>
      <CardContent className="px-8 pb-8">
        <form action={handleSubmit} className="space-y-5">
          {noticeMessage && (
            <div role="status" className="p-3 text-sm text-foreground bg-primary/10 rounded-lg text-center border border-primary/20 font-medium">
              {noticeMessage}
            </div>
          )}
          <div className="space-y-2.5">
            <Label htmlFor="identifier" className="text-sm font-medium">Username or Email</Label>
            <Input 
              id="identifier"
              name="identifier"
              placeholder="wonseok or name@example.com"
              required
              autoComplete="username"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              className="h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
            <Input 
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              aria-invalid={!!error}
              aria-describedby={error ? 'login-error' : undefined}
              className="h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
            />
          </div>
          
          {error && (
            <div id="login-error" role="alert" className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-lg text-center border border-destructive/20 font-medium">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 rounded-xl font-semibold text-base" 
            disabled={isPending}
          >
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-11 rounded-xl font-medium"
            onClick={handleGoogleLogin}
            disabled={isPending}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </Button>

          <div className="pt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href={`/${locale}/signup`} className="font-semibold text-foreground hover:text-primary transition-colors">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
