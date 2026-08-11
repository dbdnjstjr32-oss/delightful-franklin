'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ImagePlus } from 'lucide-react'
import { uploadAsset } from '@/features/portfolio/upload-client'
import { COVER_IMAGE_TYPES, MAX_COVER_BYTES, formatBytes } from '@/lib/uploads'

type Uploaded = { url: string; path: string; width: number | null; height: number | null }

/**
 * The card image for a work.
 *
 * Uploads on selection rather than on submit, so the creator sees the cover
 * land (and can swap it) before committing the rest of the form, and so a 10MB
 * file never has to fit inside a Server Action request body.
 */
export function CoverPicker({
  userId,
  defaultUrl = null,
}: {
  userId: string
  defaultUrl?: string | null
}) {
  const t = useTranslations('work')
  const [uploaded, setUploaded] = useState<Uploaded | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!preview) return
    return () => URL.revokeObjectURL(preview)
  }, [preview])

  async function accept(file: File) {
    setError(null)

    if (!(COVER_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setError(t('cover_type_error'))
      return
    }
    if (file.size > MAX_COVER_BYTES) {
      setError(t('cover_size_error', { size: formatBytes(MAX_COVER_BYTES) }))
      return
    }

    setPreview(URL.createObjectURL(file))
    setProgress(0)

    try {
      const asset = await uploadAsset(userId, file, setProgress).promise
      setUploaded({
        url: asset.url,
        path: asset.storage_path,
        width: asset.width,
        height: asset.height,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : t('cover_upload_error'))
      setPreview(null)
    } finally {
      setProgress(null)
    }
  }

  const shown = preview ?? uploaded?.url ?? defaultUrl
  const uploading = progress !== null

  return (
    <div className="space-y-2">
      <span className="overline block text-muted-foreground">{t('cover_label')}</span>

      {/* Only sent once the object exists; the action treats an absent value as
          "keep whatever is already saved". */}
      {uploaded && (
        <>
          <input type="hidden" name="thumbnail_url" value={uploaded.url} />
          <input type="hidden" name="thumbnail_path" value={uploaded.path} />
          {uploaded.width && uploaded.height && (
            <>
              <input type="hidden" name="thumbnail_width" value={uploaded.width} />
              <input type="hidden" name="thumbnail_height" value={uploaded.height} />
            </>
          )}
        </>
      )}
      {uploading && <input type="hidden" name="cover_pending" value="1" />}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void accept(file)
        }}
        className={`group relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'
        }`}
      >
        {shown ? (
          <Image src={shown} alt="" fill className="object-cover" unoptimized />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImagePlus size={24} aria-hidden />
            <span className="text-sm">{t('cover_drop')}</span>
          </span>
        )}

        {uploading ? (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-foreground/20">
            <span
              className="block h-full bg-primary transition-[width] duration-150"
              style={{ width: `${Math.max(2, progress * 100)}%` }}
            />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-sm font-medium text-background opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {shown ? t('cover_change') : t('cover_choose')}
          </span>
        )}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept={COVER_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void accept(file)
          e.target.value = ''
        }}
      />

      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
