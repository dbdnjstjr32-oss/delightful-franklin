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
    <div className="mx-auto w-full max-w-2xl px-5 pt-36 pb-24 sm:px-8">
      <p className="overline text-muted-foreground">Editing</p>
      <h1 className="mt-4 mb-10 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
        {portfolio.title}
      </h1>
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
