import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const { locale } = await params

  const requested = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // An OAuth sign-in creates the profile row through handle_new_user, which
      // copies the name and avatar from the provider but leaves `username`
      // null — the provider has nothing to fill it with. Without this gate a
      // Google user landed on the home page with no username, and since the
      // header hides the profile link when there isn't one, no route to set it
      // either. Send them to onboarding until they have one.
      let destination = requested ?? `/${locale}`
      if (!requested && data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', data.user.id)
          .maybeSingle()
        if (!profile?.username) destination = `/${locale}/onboarding`
      }

      const forwardedHost = request.headers.get('x-forwarded-host')
      const isLocalEnv = process.env.NODE_ENV === 'development'
      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`)
      } else {
        return NextResponse.redirect(`${origin}${destination}`)
      }
    }
  }

  // If error, redirect to login page with error
  return NextResponse.redirect(`${origin}/${locale}/login?error=auth_failed`)
}
