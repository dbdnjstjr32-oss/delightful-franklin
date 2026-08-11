'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Film,
  ImageIcon,
  Music,
  Paperclip,
  RotateCw,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { uploadAsset, discardAsset } from '@/features/portfolio/upload-client'
import {
  ASSET_TYPES,
  MAX_ASSETS,
  MAX_ASSET_BYTES,
  MAX_CAPTION_LEN,
  assetKind,
  formatBytes,
  type AssetKind,
  type UploadedAsset,
} from '@/lib/uploads'

type Item = {
  id: string
  name: string
  size: number
  kind: AssetKind
  /** Object URL while the file is local; the public URL once it has landed. */
  previewUrl: string | null
  progress: number
  status: 'uploading' | 'done' | 'error'
  message?: string
  asset?: UploadedAsset
  file?: File
  abort?: () => void
}

const ACCEPT = ASSET_TYPES.join(',')

const KIND_ICON: Record<AssetKind, typeof ImageIcon> = {
  image: ImageIcon,
  video: Film,
  audio: Music,
  file: FileText,
}

/** Turn a saved row back into a settled item, so editing a work shows what is
 *  already attached instead of an empty box. */
function fromExisting(asset: UploadedAsset, fallbackName: string): Item {
  return {
    id: asset.storage_path || asset.url,
    name: asset.caption || asset.storage_path?.split('/').pop() || fallbackName,
    size: asset.size_bytes,
    kind: asset.kind,
    previewUrl: asset.kind === 'image' ? asset.url : null,
    progress: 1,
    status: 'done',
    asset,
  }
}

/**
 * Multi-file attachments for a work.
 *
 * Files go straight to Supabase Storage as they are dropped, each with its own
 * progress bar and cancel, so a slow 40MB clip never blocks the rest of the
 * form. Only the resulting metadata rides along with the submission, in the
 * hidden `assets` field.
 */
export function AssetUploader({
  userId,
  defaultAssets = [],
}: {
  userId: string
  defaultAssets?: UploadedAsset[]
}) {
  const t = useTranslations('work')
  const [items, setItems] = useState<Item[]>(() =>
    defaultAssets.map((asset) => fromExisting(asset, t('attachment_fallback')))
  )
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Object URLs outlive the component unless they are handed back.
  const objectUrls = useRef<string[]>([])
  useEffect(() => {
    const urls = objectUrls.current
    return () => urls.forEach(URL.revokeObjectURL)
  }, [])

  const patch = useCallback((id: string, next: Partial<Item>) => {
    setItems((current) => current.map((it) => (it.id === id ? { ...it, ...next } : it)))
  }, [])

  const start = useCallback(
    (id: string, file: File) => {
      const handle = uploadAsset(userId, file, (fraction) => patch(id, { progress: fraction }))
      patch(id, { status: 'uploading', progress: 0, abort: handle.abort, message: undefined })

      handle.promise.then(
        (asset) =>
          patch(id, {
            status: 'done',
            progress: 1,
            // Storage keys are UUIDs, so a download row would otherwise be
            // labelled `a31f5516-….pdf`. Seed the caption with the name the
            // creator actually chose; they can still overwrite it.
            asset: asset.kind === 'file' ? { ...asset, caption: file.name } : asset,
            abort: undefined,
          }),
        (error: unknown) => {
          // A cancel is a deliberate act, not a failure to report — the row is
          // already gone from the list by the time this rejects.
          if (error instanceof DOMException && error.name === 'AbortError') return
          patch(id, {
            status: 'error',
            abort: undefined,
            message: error instanceof Error ? error.message : t('file_failed'),
          })
        }
      )
    },
    [patch, userId, t]
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      setItems((current) => {
        const room = MAX_ASSETS - current.length
        const accepted: Item[] = []

        for (const file of Array.from(files).slice(0, Math.max(0, room))) {
          const kind = assetKind(file.type)
          const id = crypto.randomUUID()
          const base: Item = {
            id,
            name: file.name,
            size: file.size,
            kind,
            previewUrl: null,
            progress: 0,
            status: 'uploading',
            file,
          }

          if (!(ASSET_TYPES as readonly string[]).includes(file.type)) {
            accepted.push({ ...base, status: 'error', message: t('file_unsupported') })
            continue
          }
          if (file.size > MAX_ASSET_BYTES) {
            accepted.push({
              ...base,
              status: 'error',
              message: t('file_too_large', { size: formatBytes(MAX_ASSET_BYTES) }),
            })
            continue
          }

          if (kind === 'image') {
            const url = URL.createObjectURL(file)
            objectUrls.current.push(url)
            base.previewUrl = url
          }
          accepted.push(base)
          // Kick the upload off outside the state updater.
          queueMicrotask(() => start(id, file))
        }

        return [...current, ...accepted]
      })
    },
    [start, t]
  )

  function remove(item: Item) {
    item.abort?.()
    // Drop the object from storage too, so a cancelled draft does not leave
    // paid-for bytes behind.
    if (item.asset?.storage_path) void discardAsset(item.asset.storage_path)
    setItems((current) => current.filter((it) => it.id !== item.id))
  }

  function move(index: number, delta: number) {
    setItems((current) => {
      const target = index + delta
      if (target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const ready = items
    .filter((it) => it.status === 'done' && it.asset)
    .map((it) => ({ ...it.asset!, caption: it.asset!.caption.slice(0, MAX_CAPTION_LEN) }))
  const busy = items.some((it) => it.status === 'uploading')
  const full = items.length >= MAX_ASSETS

  return (
    <div className="space-y-3">
      {/* The submitted value: settled assets, in the order shown. */}
      <input type="hidden" name="assets" value={JSON.stringify(ready)} />
      {/* Blocks submit while anything is still in flight — a half-uploaded file
          would otherwise be silently dropped from the work. */}
      {busy && <input type="hidden" name="assets_pending" value="1" />}

      <button
        type="button"
        disabled={full}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-8 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
          dragging ? 'border-primary bg-primary/10' : 'border-border bg-secondary/40'
        }`}
      >
        <Paperclip size={20} className="text-muted-foreground" aria-hidden />
        <span className="text-sm font-medium text-foreground">
          {full ? t('files_full', { max: MAX_ASSETS }) : t('files_drop')}
        </span>
        <span className="text-xs text-muted-foreground">
          {t('files_types', { size: formatBytes(MAX_ASSET_BYTES) })}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) addFiles(e.target.files)
          // Let the same file be picked again after a removal.
          e.target.value = ''
        }}
      />

      {items.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {items.map((item, index) => {
            const Icon = KIND_ICON[item.kind]
            return (
              <li key={item.id} className="flex items-start gap-3 p-3">
                <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded bg-secondary">
                  {item.previewUrl ? (
                    <Image
                      src={item.previewUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="56px"
                      unoptimized
                    />
                  ) : (
                    <Icon size={18} className="text-muted-foreground" aria-hidden />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.status === 'error' ? (
                      <span className="text-destructive">{item.message}</span>
                    ) : item.status === 'uploading' ? (
                      t('file_uploading', { percent: Math.round(item.progress * 100) })
                    ) : (
                      formatBytes(item.size)
                    )}
                  </p>

                  {item.status === 'uploading' && (
                    <div
                      role="progressbar"
                      aria-label={t('file_progress_aria', { name: item.name })}
                      aria-valuenow={Math.round(item.progress * 100)}
                      className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary"
                    >
                      <div
                        className="h-full bg-primary transition-[width] duration-150"
                        style={{ width: `${Math.max(2, item.progress * 100)}%` }}
                      />
                    </div>
                  )}

                  {item.status === 'done' && item.asset && (
                    // Controlled: the caption lives in `items`, and reordering
                    // re-renders the row. With `defaultValue` Base UI warns that
                    // an uncontrolled field's default changed after mount.
                    <Input
                      aria-label={t('caption_aria', { name: item.name })}
                      placeholder={t('caption_placeholder')}
                      maxLength={MAX_CAPTION_LEN}
                      value={item.asset.caption}
                      onChange={(e) =>
                        patch(item.id, { asset: { ...item.asset!, caption: e.target.value } })
                      }
                      className="mt-2 h-8"
                    />
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  {item.status === 'done' && (
                    <>
                      <button
                        type="button"
                        aria-label={t('move_up_aria', { name: item.name })}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ArrowUp size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label={t('move_down_aria', { name: item.name })}
                        disabled={index === items.length - 1}
                        onClick={() => move(index, 1)}
                        className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
                      >
                        <ArrowDown size={14} aria-hidden />
                      </button>
                    </>
                  )}
                  {item.status === 'error' && item.file && (
                    <button
                      type="button"
                      aria-label={t('retry_aria', { name: item.name })}
                      onClick={() => start(item.id, item.file!)}
                      className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <RotateCw size={14} aria-hidden />
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={t('remove_aria', { name: item.name })}
                    onClick={() => remove(item)}
                    className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X size={14} aria-hidden />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
