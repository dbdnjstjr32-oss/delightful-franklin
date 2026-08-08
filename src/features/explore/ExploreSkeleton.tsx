import { Skeleton } from '@/components/ui/skeleton'
import { MasonryGrid } from '@/components/portfolio/MasonryGrid'

// Staggered heights so the placeholder reads as a masonry wall rather than a
// uniform grid that is about to reflow.
const HEIGHTS = ['aspect-[4/3]', 'aspect-[3/4]', 'aspect-square', 'aspect-[16/10]', 'aspect-[4/5]', 'aspect-[3/2]']

export function ExploreSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div aria-hidden>
      <MasonryGrid>
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className={`w-full ${HEIGHTS[i % HEIGHTS.length]}`} />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-3 w-2/5" />
          </div>
        ))}
      </MasonryGrid>
    </div>
  )
}
