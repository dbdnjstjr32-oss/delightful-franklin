'use client'

import { createClient } from '@/lib/supabase/client'
import {
  assetKind,
  storageKeyFor,
  type UploadedAsset,
  type AssetKind,
} from '@/lib/uploads'

/**
 * Browser → Supabase Storage, with byte progress.
 *
 * Files used to travel through the server action that saved the work. Two
 * problems with that: Server Actions cap the request body at 1MB by default, so
 * the form's own 10MB limit was unreachable; and the upload gave no feedback
 * until the whole request finished.
 *
 * Uploading straight from the browser fixes both. The storage policies in
 * 0004_portfolio_crud.sql still scope writes to `${auth.uid()}/…`, so the anon
 * key in the browser buys nothing extra — the action then re-validates the
 * paths it is handed before writing any row.
 *
 * supabase-js has no progress callback (it goes through fetch), so this asks the
 * SDK for a signed upload URL and PUTs to it with XHR, which does.
 */

export type UploadHandle = {
  promise: Promise<UploadedAsset>
  abort: () => void
}

type SignedUpload = { signedUrl: string; path: string }

async function putWithProgress(
  signed: SignedUpload,
  file: File,
  onProgress: (fraction: number) => void,
  xhr: XMLHttpRequest
): Promise<void> {
  return new Promise((resolve, reject) => {
    // Mirrors what storage-js sends for a Blob body: multipart, with the file
    // in the empty-named field. The browser sets the boundary itself.
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)

    xhr.open('PUT', signed.signedUrl, true)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(1)
        resolve()
        return
      }
      let message = `Upload failed (${xhr.status}).`
      try {
        const parsed = JSON.parse(xhr.responseText)
        if (parsed?.message) message = parsed.message
      } catch {
        // Non-JSON error body — the status line is all we have.
      }
      reject(new Error(message))
    }
    xhr.onerror = () => reject(new Error('Network error during upload.'))
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'))
    xhr.send(body)
  })
}

/** Intrinsic size of an image, so cards can reserve the exact height before the
 *  file loads. Best-effort: a failure falls back to null and a 4:3 box. */
async function measure(file: File, kind: AssetKind) {
  if (kind !== 'image' || file.type === 'image/svg+xml') return { width: null, height: null }
  try {
    const bitmap = await createImageBitmap(file)
    const size = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    return size
  } catch {
    return { width: null, height: null }
  }
}

/**
 * Start an upload. Returns immediately with the promise and an abort handle so
 * the caller can render a cancellable row per file.
 */
export function uploadAsset(
  userId: string,
  file: File,
  onProgress: (fraction: number) => void
): UploadHandle {
  const xhr = new XMLHttpRequest()
  let aborted = false

  const promise = (async (): Promise<UploadedAsset> => {
    const supabase = createClient()
    const kind = assetKind(file.type)
    const path = storageKeyFor(userId, file.type)

    const { data: signed, error } = await supabase.storage
      .from('portfolios')
      .createSignedUploadUrl(path)

    if (error || !signed) {
      throw new Error(error?.message ?? 'Could not start the upload.')
    }
    // The signed URL is only valid for this key, so an abort between the two
    // calls must not fire off a PUT.
    if (aborted) throw new DOMException('Upload cancelled', 'AbortError')

    const [, size] = await Promise.all([
      putWithProgress(signed, file, onProgress, xhr),
      measure(file, kind),
    ])

    const { data: pub } = supabase.storage.from('portfolios').getPublicUrl(path)

    return {
      url: pub.publicUrl,
      storage_path: path,
      kind,
      mime_type: file.type,
      size_bytes: file.size,
      width: size.width,
      height: size.height,
      caption: '',
    }
  })()

  return {
    promise,
    abort: () => {
      aborted = true
      xhr.abort()
    },
  }
}

/** Best-effort cleanup for a file the creator removed before saving. Storage
 *  delete is owner-scoped by policy, so a stale path simply no-ops. */
export async function discardAsset(storagePath: string): Promise<void> {
  try {
    await createClient().storage.from('portfolios').remove([storagePath])
  } catch {
    // An orphaned object is not worth interrupting the creator over.
  }
}
