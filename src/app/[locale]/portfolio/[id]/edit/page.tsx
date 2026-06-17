import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { PortfolioForm } from '@/features/portfolio/components/PortfolioForm'
import { updatePortfolio } from '@/features/portfolio/actions'
import { getPortfolioById } from '@/features/portfolio/data'

type Props = { params: Promise<{ locale: string; id: string }> }

export default async function EditPortfolioPage({ params }: Props) {
  const { locale, id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const portfolio = await getPortfolioById(id)
  if (!portfolio) notFound()
  if (portfolio.user_id !== user.id) {
    redirect(`/${locale}/portfolio/${id}`)
  }

  const tags = (portfolio.portfolio_tags
    ?.map((pt: { tags: { name: string } | null }) => pt.tags?.name)
    .filter(Boolean) ?? []) as string[]

  return (
    <div className="pt-24 px-6 max-w-2xl mx-auto min-h-screen pb-20">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Edit portfolio</h1>
      <p className="text-muted-foreground mb-8">Update the details of your work.</p>
      <PortfolioForm
        action={updatePortfolio}
        submitLabel="Save changes"
        defaults={{
          id: portfolio.id,
          title: portfolio.title,
          description: portfolio.description,
          category: portfolio.category,
          project_url: portfolio.project_url,
          thumbnail_url: portfolio.thumbnail_url,
          tags,
        }}
      />
    </div>
  )
}
