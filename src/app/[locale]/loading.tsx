import { Skeleton } from '@/components/ui/skeleton'

/** Route-level fallback. Mirrors the shape every page shares — a large heading
 *  block over a card grid — so the layout doesn't jump when content arrives. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[110rem] px-5 pt-32 pb-24 sm:px-8" aria-busy>
      <span className="sr-only">Loading…</span>

      <div className="max-w-3xl space-y-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-16 w-full sm:h-20" />
        <Skeleton className="h-16 w-4/5 sm:h-20" />
        <Skeleton className="h-5 w-2/3" />
      </div>

      <div className="mt-20 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </div>
    </div>
  )
}
