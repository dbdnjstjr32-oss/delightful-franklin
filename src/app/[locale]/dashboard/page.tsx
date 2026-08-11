import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { StudioClient } from '@/features/studio/StudioClient'
import type { StudioWork } from '@/features/studio/types'

type TagName = { name: string }

type WorkRow = {
  id: string
  title: string
  thumbnail_url: string | null
  category: string | null
  views: number | null
  likes: number | null
  status: string | null
  created_at: string
  updated_at: string | null
  portfolio_assets: { count: number }[] | null
  // PostgREST types a nested embed as an array; the runtime shape here is a
  // single row per link, so accept both rather than casting through `unknown`.
  portfolio_tags: { tags: TagName | TagName[] | null }[] | null
}

function tagNames(links: WorkRow['portfolio_tags']): string[] {
  return (links ?? [])
    .flatMap((link) => (Array.isArray(link.tags) ? link.tags : [link.tags]))
    .map((tag) => tag?.name)
    .filter((name): name is string => !!name)
}

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  // Drafts included on purpose — this is the one view that shows them, and RLS
  // scopes them to their owner. `portfolio_assets(count)` is an aggregate
  // embed, so the file badge costs no extra round-trip.
  const [{ data: profile }, { data: portfolios }] = await Promise.all([
    supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle(),
    supabase
      .from('portfolios')
      .select(
        'id, title, thumbnail_url, category, views, likes, status, created_at, updated_at, portfolio_assets(count), portfolio_tags(tags(name))'
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const works: StudioWork[] = ((portfolios ?? []) as WorkRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    thumbnail_url: row.thumbnail_url,
    category: row.category,
    views: row.views ?? 0,
    likes: row.likes ?? 0,
    status: row.status === 'draft' ? 'draft' : 'published',
    created_at: row.created_at,
    updated_at: row.updated_at,
    assetCount: row.portfolio_assets?.[0]?.count ?? 0,
    tags: tagNames(row.portfolio_tags),
  }))

  const t = await getTranslations({ locale, namespace: 'studio' })
  const name = profile?.display_name || profile?.username || t('fallback_name')

  return <StudioClient works={works} locale={locale} name={name} />
}
