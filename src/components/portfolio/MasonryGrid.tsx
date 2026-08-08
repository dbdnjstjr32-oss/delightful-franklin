import { cn } from '@/lib/utils'

/** CSS-columns masonry.
 *
 *  Columns (rather than a JS layout pass) keep this renderable on the server
 *  with no measuring and no layout jump. Children must not shrink below their
 *  content — `break-inside-avoid` keeps a card from being split across columns.
 *
 *  Note: columns fill top-to-bottom, so reading order runs down each column
 *  rather than across rows. That matches how people scan a gallery wall, but it
 *  is the reason this is only used for browsing grids, never for ranked lists.
 */
export function MasonryGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'columns-1 gap-5 sm:columns-2 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid',
        className
      )}
    >
      {children}
    </div>
  )
}
