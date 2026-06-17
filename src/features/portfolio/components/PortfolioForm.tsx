'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ImagePlus } from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'

export type PortfolioFormDefaults = {
  id?: string
  title?: string
  description?: string | null
  category?: string | null
  project_url?: string | null
  thumbnail_url?: string | null
  tags?: string[]
}

type Props = {
  action: (formData: FormData) => Promise<{ error?: string } | void>
  submitLabel: string
  defaults?: PortfolioFormDefaults
}

const inputClass =
  'h-11 px-4 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30'

export function PortfolioForm({ action, submitLabel, defaults }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // Revoke the blob URL when the preview changes / unmounts.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await action(formData)
      if (result?.error) setError(result.error)
    })
  }

  const currentImage = preview ?? defaults?.thumbnail_url ?? null

  return (
    <form action={handleSubmit} className="space-y-6">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      {/* Thumbnail */}
      <div className="space-y-2.5">
        <Label className="text-sm font-medium">Cover image</Label>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-full aspect-[16/9] rounded-2xl bg-secondary/50 border border-dashed border-border overflow-hidden flex items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {currentImage ? (
            <Image src={currentImage} alt="Cover preview" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus size={24} />
              <span className="text-sm">Click to upload a cover image</span>
            </div>
          )}
          <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-sm font-medium">
            Change image
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          name="thumbnail"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Title */}
      <div className="space-y-2.5">
        <Label htmlFor="title" className="text-sm font-medium">Title</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={defaults?.title ?? ''}
          placeholder="Give your work a title"
          aria-invalid={!!error}
          aria-describedby={error ? 'portfolio-error' : undefined}
          className={inputClass}
        />
      </div>

      {/* Category */}
      <div className="space-y-2.5">
        <Label htmlFor="category" className="text-sm font-medium">Category</Label>
        <select
          id="category"
          name="category"
          required
          defaultValue={defaults?.category ?? ''}
          className="w-full h-11 px-4 bg-secondary/50 border border-border rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <option value="" disabled>Choose a category</option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="space-y-2.5">
        <Label htmlFor="description" className="text-sm font-medium">Description</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={2000}
          defaultValue={defaults?.description ?? ''}
          placeholder="Describe your project…"
          className="resize-none h-28 px-4 py-3 bg-secondary/50 border-border rounded-xl focus-visible:ring-primary/30"
        />
      </div>

      {/* Project URL */}
      <div className="space-y-2.5">
        <Label htmlFor="project_url" className="text-sm font-medium">Project link (optional)</Label>
        <Input
          id="project_url"
          name="project_url"
          type="url"
          defaultValue={defaults?.project_url ?? ''}
          placeholder="https://…"
          className={inputClass}
        />
      </div>

      {/* Tags */}
      <div className="space-y-2.5">
        <Label htmlFor="tags" className="text-sm font-medium">Tags (comma separated, up to 8)</Label>
        <Input
          id="tags"
          name="tags"
          defaultValue={(defaults?.tags ?? []).join(', ')}
          placeholder="branding, motion, 3d"
          className={inputClass}
        />
      </div>

      {error && (
        <div
          id="portfolio-error"
          role="alert"
          className="p-3 text-sm text-destructive-foreground bg-destructive/10 rounded-lg text-center border border-destructive/20 font-medium"
        >
          {error}
        </div>
      )}

      <Button type="submit" disabled={isPending} className="w-full h-11 rounded-xl font-semibold text-base">
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
