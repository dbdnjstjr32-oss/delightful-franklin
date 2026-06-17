import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PortfolioForm } from '@/features/portfolio/components/PortfolioForm'
import { createPortfolio } from '@/features/portfolio/actions'

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
    <div className="pt-24 px-6 max-w-2xl mx-auto min-h-screen pb-20">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Upload</h1>
      <p className="text-muted-foreground mb-8">Publish a new piece to your portfolio.</p>
      <PortfolioForm action={createPortfolio} submitLabel="Publish" />
    </div>
  )
}
