import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UploadPage({ params }: { params: Promise<{ locale: string }> }) {
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
      <h1 className="text-3xl font-bold tracking-tight mb-2">Upload</h1>
      <p className="text-muted-foreground mb-8">Publish a new piece to your portfolio.</p>

      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4 mx-auto text-2xl">
          ↑
        </div>
        <p className="font-medium mb-1">Upload coming soon</p>
        <p className="text-sm text-muted-foreground">
          Portfolio publishing is not wired up yet. Check back shortly.
        </p>
      </div>
    </div>
  )
}
