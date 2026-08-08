'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FormError } from '@/components/ui/form-parts'
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

export function PortfolioForm({ action, submitLabel, defaults }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Revoke the blob URL when the preview changes / unmounts.
  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function acceptFile(file: File) {
    setPreview(URL.createObjectURL(file))

    // Measure the cover so the masonry cards can reserve its exact height.
    // A failure here is not worth blocking the upload — the card falls back
    // to 4:3 when the size is unknown.
    try {
      const bitmap = await createImageBitmap(file)
      setDimensions({ width: bitmap.width, height: bitmap.height })
      bitmap.close()
    } catch {
      setDimensions(null)
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) void acceptFile(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    // Put the dropped file on the real input so it is part of the submission.
    if (fileRef.current) fileRef.current.files = e.dataTransfer.files
    void acceptFile(file)
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
    <form action={handleSubmit} className="space-y-8">
      {defaults?.id && <input type="hidden" name="id" value={defaults.id} />}

      <div className="space-y-2">
        <span className="overline block text-muted-foreground">Cover image</span>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`group relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors ${
            dragging ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'
          }`}
        >
          {currentImage ? (
            <Image src={currentImage} alt="" fill className="object-cover" unoptimized />
          ) : (
            <span className="flex flex-col items-center gap-2 text-muted-foreground">
              <ImagePlus size={24} aria-hidden />
              <span className="text-sm">Drop an image here, or click to choose</span>
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-sm font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {currentImage ? 'Change image' : 'Choose image'}
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
        {dimensions && (
          <>
            <input type="hidden" name="thumbnail_width" value={dimensions.width} />
            <input type="hidden" name="thumbnail_height" value={dimensions.height} />
          </>
        )}
      </div>

      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          name="title"
          variant="field"
          required
          maxLength={120}
          defaultValue={defaults?.title ?? ''}
          placeholder="Give your work a title"
          aria-invalid={!!error}
          aria-describedby={error ? 'portfolio-error' : undefined}
        />
      </Field>

      <Field label="Category" htmlFor="category">
        <select
          id="category"
          name="category"
          required
          defaultValue={defaults?.category ?? ''}
          className="h-12 w-full rounded-md border border-input bg-secondary/50 px-4 text-base text-foreground"
        >
          <option value="" disabled>
            Choose a category
          </option>
          {CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          variant="field"
          maxLength={2000}
          defaultValue={defaults?.description ?? ''}
          placeholder="What is this project, and what did you set out to do?"
          className="h-36"
        />
      </Field>

      <Field label="Project link" htmlFor="project_url" hint="Optional.">
        <Input
          id="project_url"
          name="project_url"
          type="url"
          variant="field"
          defaultValue={defaults?.project_url ?? ''}
          placeholder="https://…"
        />
      </Field>

      <Field label="Tags" htmlFor="tags" hint="Comma separated, up to 8.">
        <Input
          id="tags"
          name="tags"
          variant="field"
          defaultValue={(defaults?.tags ?? []).join(', ')}
          placeholder="branding, motion, 3d"
        />
      </Field>

      {error && <FormError id="portfolio-error">{error}</FormError>}

      <Button
        type="submit"
        size="lg"
        disabled={isPending}
        className="h-12 w-full rounded-full text-base font-semibold"
      >
        {isPending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  )
}
