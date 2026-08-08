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
    <div className="mx-auto w-full max-w-2xl px-5 pt-36 pb-24 sm:px-8">
      <p className="overline text-muted-foreground">New work</p>
      <h1 className="mt-4 mb-10 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
        Upload
      </h1>
      <PortfolioForm action={createPortfolio} submitLabel="Publish" />
    </div>
  )
}
