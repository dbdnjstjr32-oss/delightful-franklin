// How a creator chooses to *present* their work, as opposed to what they
// uploaded. Both of these are display decisions stored alongside the media:
// nothing here alters a file.
//
// Plain module (no 'server-only') — the form, the work page and the server
// actions that validate the submission all read from it.

/** Aspect ratios offered in the upload form. `null` means "use the file's own
 *  proportions", which is what everything did before these were introduced. */
export const RATIOS = ['16:9', '4:3', '1:1', '3:4', '9:16'] as const

export type Ratio = (typeof RATIOS)[number]

export function isRatio(value: unknown): value is Ratio {
  return typeof value === 'string' && (RATIOS as readonly string[]).includes(value)
}

/** Normalise untrusted input to a stored ratio, or null for "original". */
export function parseRatio(value: unknown): Ratio | null {
  return isRatio(value) ? value : null
}

/** CSS `aspect-ratio` value. Falls back to the measured intrinsic size, then to
 *  4:3 when nothing is known — the same fallback the masonry cards have used
 *  since 0005_media_dimensions.sql. */
export function aspectRatio(
  ratio: string | null | undefined,
  width?: number | null,
  height?: number | null
): string {
  if (isRatio(ratio)) return ratio.replace(':', ' / ')
  if (width && height) return `${width} / ${height}`
  return '4 / 3'
}

/** Work-page layouts. The stored value is the key; labels are translated. */
export const LAYOUTS = ['gallery', 'deck', 'case_study'] as const

export type Layout = (typeof LAYOUTS)[number]

export function parseLayout(value: unknown): Layout {
  return typeof value === 'string' && (LAYOUTS as readonly string[]).includes(value)
    ? (value as Layout)
    : 'gallery'
}
