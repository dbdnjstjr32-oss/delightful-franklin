// Upload rules shared by the browser uploader and the server actions that
// persist what it produced. Plain module (no 'server-only') on purpose: the
// client needs the limits to reject a file before spending bandwidth, and the
// server needs the same limits because the client is not a security boundary.

export const COVER_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

/** Attachment types a work can carry. Kept to formats a browser can render
 *  inline, plus PDF and ZIP for downloadable deliverables.
 *
 *  Mirrored by the bucket's `allowed_mime_types` in 0007_upload_hardening.sql —
 *  that is what actually enforces this, since uploads go browser-to-storage.
 *  Keep both lists in step.
 *
 *  No image/svg+xml: an SVG carries script, and these objects are served from a
 *  public bucket under their own origin. */
export const ASSET_TYPES = [
  ...COVER_IMAGE_TYPES,
  'image/avif',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'application/zip',
] as const

export const MAX_COVER_BYTES = 10 * 1024 * 1024 // 10MB
/** Supabase Storage rejects anything over the project's global file-size limit,
 *  50MB by default. Failing here gives a readable message instead of a 413. */
export const MAX_ASSET_BYTES = 50 * 1024 * 1024
export const MAX_ASSETS = 20
export const MAX_CAPTION_LEN = 200

export type AssetKind = 'image' | 'video' | 'audio' | 'file'

export function assetKind(mimeType: string): AssetKind {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

/** What the uploader hands to the form, and what the server re-validates before
 *  writing it through set_portfolio_assets. `ratio` is the creator's chosen
 *  display frame (see lib/presentation.ts); null means the file's own shape. */
export type UploadedAsset = {
  url: string
  storage_path: string
  kind: AssetKind
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  caption: string
  ratio: string | null
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'application/pdf': 'pdf',
  'application/zip': 'zip',
}

/** Extension for a storage key. Derived from the MIME type rather than the
 *  supplied filename, which is attacker-controlled and may carry a path. */
export function extensionFor(mimeType: string): string {
  return EXTENSIONS[mimeType] ?? mimeType.split('/')[1]?.replace(/[^a-z0-9]/gi, '') ?? 'bin'
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Storage keys are `${userId}/<uuid>.<ext>` — the leading folder is what the
 *  bucket policies in 0004_portfolio_crud.sql compare against auth.uid(). */
export function storageKeyFor(userId: string, mimeType: string): string {
  return `${userId}/${crypto.randomUUID()}.${extensionFor(mimeType)}`
}
