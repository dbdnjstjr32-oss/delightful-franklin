import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
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
    <div className="pt-24 px-6 max-w-7xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
      <p className="text-muted-foreground mb-8">
        Welcome back, {profile?.display_name || profile?.username || 'Creator'}.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="font-semibold mb-2">Your Portfolios</h2>
          <p className="text-sm text-muted-foreground">Manage your published and draft works.</p>
        </div>
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="font-semibold mb-2">Analytics</h2>
          <p className="text-sm text-muted-foreground">View your total views and appreciations.</p>
        </div>
        <div className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="font-semibold mb-2">Settings</h2>
          <p className="text-sm text-muted-foreground">Update your profile and preferences.</p>
        </div>
      </div>
    </div>
  )
}
