'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deletePortfolio } from '@/features/portfolio/actions'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

/** Delete confirmation.
 *
 *  Replaces window.confirm(), which is unstyled, untranslatable, and blocks the
 *  main thread. The destructive action stays behind an explicit second step.
 */
export function DeletePortfolioButton({ id, title }: { id: string; title: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    const formData = new FormData()
    formData.set('id', id)
    startTransition(async () => {
      const result = await deletePortfolio(formData)
      // A successful delete redirects, so reaching here at all means it failed.
      if (result?.error) {
        setOpen(false)
        toast.error(result.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        aria-label={`Delete ${title}`}
        className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 size={16} aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="font-display text-xl tracking-tightest">
          Delete this work?
        </DialogTitle>
        <DialogDescription>
          “{title}” will be removed permanently, along with its views and appreciations. This cannot
          be undone.
        </DialogDescription>
        <DialogFooter className="flex-row justify-end gap-2">
          <DialogClose
            render={<Button variant="ghost" size="lg" className="h-11 rounded-full px-5" />}
          >
            Cancel
          </DialogClose>
          <Button
            variant="destructive"
            size="lg"
            className="h-11 rounded-full px-5"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
