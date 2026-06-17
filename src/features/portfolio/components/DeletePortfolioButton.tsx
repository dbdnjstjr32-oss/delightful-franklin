'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { deletePortfolio } from '@/features/portfolio/actions'

export function DeletePortfolioButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        if (!window.confirm('Delete this portfolio? This cannot be undone.')) return
        startTransition(() => {
          deletePortfolio(formData)
        })
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={isPending}
        aria-label="Delete portfolio"
        className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-muted-foreground hover:bg-destructive/10 hover:text-destructive-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Trash2 size={15} />
      </button>
    </form>
  )
}
