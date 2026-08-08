import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  return (
    <div className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 pt-36 pb-24 sm:px-8">
      <p className="overline text-muted-foreground">Account</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
        Settings
      </h1>

      <dl className="mt-12 divide-y divide-border border-y border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <dt className="font-display text-xl font-bold tracking-tightest">Profile</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Username, display name, bio, avatar, and links.
            </dd>
          </div>
          <Link
            href={`/${locale}/onboarding`}
            className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            Edit
          </Link>
        </div>

        <div className="py-6">
          <dt className="font-display text-xl font-bold tracking-tightest">Email and password</dt>
          <dd className="mt-1 text-sm text-muted-foreground">
            Not available yet — sign-in details are managed by your provider for now.
          </dd>
        </div>
      </dl>
    </div>
  )
}
