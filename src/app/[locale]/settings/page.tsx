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
    <div className="pt-24 px-6 max-w-3xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">Manage your profile and account.</p>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-6 rounded-2xl bg-card border border-border">
          <div>
            <h2 className="font-semibold mb-1">Profile</h2>
            <p className="text-sm text-muted-foreground">Username, display name, bio, avatar, and links.</p>
          </div>
          <Link
            href={`/${locale}/onboarding`}
            className="px-4 py-2 rounded-full text-sm font-medium bg-foreground text-background hover:opacity-80 transition-opacity whitespace-nowrap"
          >
            Edit
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="font-semibold mb-1">Account</h2>
          <p className="text-sm text-muted-foreground">
            Email and password management coming soon.
          </p>
        </div>
      </div>
    </div>
  )
}
