import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import Link from 'next/link'
import { ProfileSettingsForm } from '@/features/auth/components/ProfileSettingsForm'
import { McpTokenPanel } from '@/features/auth/components/McpTokenPanel'

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, website, avatar_url')
    .eq('id', user.id)
    .maybeSingle()

  const t = await getTranslations({ locale, namespace: 'auth' })

  return (
    <div className="mx-auto min-h-[70vh] w-full max-w-2xl px-5 pt-36 pb-24 sm:px-8">
      <p className="overline text-muted-foreground">{t('settings_kicker')}</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
        {t('settings_heading')}
      </h1>

      {/* The profile used to be editable only by walking back through the
          onboarding funnel, which then dropped the user at the studio. */}
      <ProfileSettingsForm
        profile={{
          username: profile?.username ?? null,
          display_name: profile?.display_name ?? null,
          bio: profile?.bio ?? null,
          website: profile?.website ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
      />

      <dl className="mt-16 divide-y divide-border border-y border-border">
        <div className="py-6">
          <dt className="font-display text-xl font-bold tracking-tightest">
            {t('settings_credentials_title')}
          </dt>
          <dd className="mt-1 text-sm text-muted-foreground">{t('settings_credentials_body')}</dd>
        </div>

        <McpTokenPanel />
      </dl>

      {profile?.username && (
        <p className="mt-8 text-sm text-muted-foreground">
          {t('settings_view_public')}{' '}
          <Link
            href={`/${locale}/u/${profile.username}`}
            className="font-semibold text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline"
          >
            @{profile.username}
          </Link>
        </p>
      )}
    </div>
  )
}
