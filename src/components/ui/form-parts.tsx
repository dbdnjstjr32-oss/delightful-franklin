import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/** Label + control + spacing, so forms stop repeating the same wrapper. */
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className,
}: {
  label: string
  htmlFor: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

/** Inline form error. Announced on render, and coloured with `destructive`
 *  itself rather than `destructive-foreground` — the latter is the colour for
 *  text on a solid destructive fill (white on light), which was invisible on
 *  this tinted background. */
export function FormError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role="alert"
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
    >
      {children}
    </p>
  )
}
