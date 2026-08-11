import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
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

  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: 'auth' }),
    getTranslations({ locale, namespace: 'common' }),
  ])

  return (
    <div className="mx-auto min-h-[70vh] w-full max-w-3xl px-5 pt-36 pb-24 sm:px-8">
      <p className="overline text-muted-foreground">{t('settings_kicker')}</p>
      <h1 className="mt-4 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
        {t('settings_heading')}
      </h1>

      <dl className="mt-12 divide-y divide-border border-y border-border">
        <div className="flex flex-wrap items-center justify-between gap-4 py-6">
          <div>
            <dt className="font-display text-xl font-bold tracking-tightest">
              {t('settings_profile_title')}
            </dt>
            <dd className="mt-1 text-sm text-muted-foreground">{t('settings_profile_body')}</dd>
          </div>
          <Link
            href={`/${locale}/onboarding`}
            className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
          >
            {tCommon('edit')}
          </Link>
        </div>

        <div className="py-6">
          <dt className="font-display text-xl font-bold tracking-tightest">
            {t('settings_credentials_title')}
          </dt>
          <dd className="mt-1 text-sm text-muted-foreground">{t('settings_credentials_body')}</dd>
        </div>
      </dl>
    </div>
  )
}
