import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingForm } from '@/features/auth/components/OnboardingForm'

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username')
    .eq('id', user.id)
    .maybeSingle()

  return (
    <div className="mx-auto w-full max-w-md px-5 pt-36 pb-24 sm:px-8">
      <OnboardingForm
        defaultName={profile?.display_name || ''}
        defaultUsername={profile?.username || null}
      />
    </div>
  )
}
