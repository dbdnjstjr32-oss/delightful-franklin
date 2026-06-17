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

  return (
    <div className="pt-24 px-6 max-w-5xl mx-auto min-h-screen pb-20">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.display_name || profile?.username || 'Creator'}.
          </p>
        </div>
        <Link
          href={`/${locale}/upload`}
          className="flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2.5 rounded-full hover:opacity-80 transition-opacity whitespace-nowrap"
        >
          <Plus size={15} />
          New
        </Link>
      </div>

      <h2 className="text-lg font-semibold mb-4">
        Your Portfolios
        <span className="text-muted-foreground font-normal ml-2 text-sm">{list.length}</span>
      </h2>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border bg-card">
          <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-4 text-2xl">✦</div>
          <p className="font-medium mb-1">No portfolios yet</p>
          <p className="text-sm text-muted-foreground mb-5">Publish your first piece to get started.</p>
          <Link
            href={`/${locale}/upload`}
            className="flex items-center gap-1.5 text-sm font-medium bg-foreground text-background px-4 py-2.5 rounded-full hover:opacity-80 transition-opacity"
          >
            <Plus size={15} />
            Upload
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-4 p-3 rounded-2xl bg-card border border-border"
            >
              <Link
                href={`/${locale}/portfolio/${p.id}`}
                className="relative w-20 h-14 rounded-lg overflow-hidden bg-secondary flex-shrink-0"
              >
                {p.thumbnail_url ? (
                  <Image src={p.thumbnail_url} alt={p.title} fill className="object-cover" sizes="80px" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/40">✦</span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  href={`/${locale}/portfolio/${p.id}`}
                  className="font-medium truncate block hover:text-primary transition-colors"
                >
                  {p.title}
                </Link>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {p.category && <span className="capitalize">{p.category}</span>}
                  <span className="flex items-center gap-1"><Eye size={11} />{(p.views ?? 0).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><Heart size={11} />{(p.likes ?? 0).toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/${locale}/portfolio/${p.id}/edit`}
                  aria-label="Edit portfolio"
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <Pencil size={15} />
                </Link>
                <DeletePortfolioButton id={p.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
