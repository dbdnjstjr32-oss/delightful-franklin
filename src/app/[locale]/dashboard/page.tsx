import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Pencil, Eye, Heart } from 'lucide-react'
import { DeletePortfolioButton } from '@/features/portfolio/components/DeletePortfolioButton'

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/${locale}/login`)
  }

  const [{ data: profile }, { data: portfolios }] = await Promise.all([
    supabase.from('profiles').select('display_name, username').eq('id', user.id).maybeSingle(),
    supabase
      .from('portfolios')
      .select('id, title, thumbnail_url, category, views, likes, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const list = portfolios ?? []
  const name = profile?.display_name || profile?.username || 'Creator'

  return (
    <div className="mx-auto min-h-[70vh] max-w-[110rem] px-5 pt-32 pb-24 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-border pb-8">
        <div>
          <p className="overline text-muted-foreground">Dashboard</p>
          <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tightest sm:text-6xl">
            {name}
          </h1>
        </div>
        <Link
          href={`/${locale}/upload`}
          className="inline-flex h-12 items-center gap-1.5 rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-85"
        >
          <Plus size={16} aria-hidden />
          New work
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="mt-16 flex flex-col items-center justify-center border-y border-dashed border-border py-28 text-center">
          <p className="font-display text-3xl font-bold tracking-tightest">Nothing published yet</p>
          <p className="mt-3 max-w-sm text-sm text-muted-foreground">
            Your first piece is the one that gets you found. It takes about a minute.
          </p>
          <Link
            href={`/${locale}/upload`}
            className="mt-8 inline-flex h-12 items-center gap-1.5 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition-opacity hover:opacity-85"
          >
            <Plus size={16} aria-hidden />
            Upload
          </Link>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {list.map((p) => (
            <li key={p.id} className="flex items-center gap-4 py-4 sm:gap-6">
              <Link
                href={`/${locale}/portfolio/${p.id}`}
                className="relative aspect-[4/3] w-24 shrink-0 overflow-hidden rounded-md bg-secondary sm:w-32"
              >
                {p.thumbnail_url ? (
                  <Image
                    src={p.thumbnail_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="overline text-muted-foreground">{p.category ?? '—'}</span>
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/portfolio/${p.id}`}
                  className="block truncate font-display text-xl font-bold tracking-tightest text-foreground decoration-primary decoration-2 underline-offset-4 hover:underline sm:text-2xl"
                >
                  {p.title}
                </Link>
                <div className="mt-1.5 flex items-center gap-4 text-xs text-muted-foreground">
                  {p.category && <span className="capitalize">{p.category}</span>}
                  <span className="flex items-center gap-1">
                    <Eye size={12} aria-hidden />
                    {(p.views ?? 0).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Heart size={12} aria-hidden />
                    {(p.likes ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/${locale}/portfolio/${p.id}/edit`}
                  aria-label={`Edit ${p.title}`}
                  className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Pencil size={16} aria-hidden />
                </Link>
                <DeletePortfolioButton id={p.id} title={p.title} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
