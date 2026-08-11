import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { UploadedAsset } from '@/lib/uploads'

export const PORTFOLIO_ASSET_COLUMNS =
  'url, storage_path, kind, mime_type, size_bytes, width, height, caption, ratio, position'

/**
 * Fetch a single portfolio with its creator, tags and attachments.
 *
 * Wrapped in React `cache()` so `generateMetadata` and the page component share
 * one DB round-trip per request instead of querying the same row twice.
 *
 * Drafts are filtered by RLS, not here — 0006_creator_studio.sql restricts the
 * SELECT policy to published rows plus the owner's own, so this returns null
 * for a visitor and the row for its creator.
 */
export const getPortfolioById = cache(async (id: string) => {
  const supabase = await createClient()
  const { data } = await supabase
    .from('portfolios')
    .select(
      `*,
       profiles(id, username, display_name, avatar_url, bio, website),
       portfolio_tags(tags(name)),
       portfolio_assets(${PORTFOLIO_ASSET_COLUMNS})`
    )
    .eq('id', id)
    .order('position', { referencedTable: 'portfolio_assets', ascending: true })
    .maybeSingle()

  return data
})

type AssetRow = Partial<UploadedAsset> & { position?: number }

/** Normalise the embedded rows into the shape the uploader and the gallery
 *  both speak. */
export function toUploadedAssets(rows: AssetRow[] | null | undefined): UploadedAsset[] {
  return (rows ?? []).map((row) => ({
    url: row.url ?? '',
    storage_path: row.storage_path ?? '',
    kind: row.kind ?? 'image',
    mime_type: row.mime_type ?? '',
    size_bytes: row.size_bytes ?? 0,
    width: row.width ?? null,
    height: row.height ?? null,
    caption: row.caption ?? '',
    ratio: row.ratio ?? null,
  }))
}
