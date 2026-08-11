'use server'

import { createClient } from '@/lib/supabase/server'
import { localeFromReferer } from '@/lib/locale'
import { CATEGORY_KEYS } from '@/lib/categories'
import {
  ASSET_TYPES,
  COVER_IMAGE_TYPES,
  MAX_ASSETS,
  MAX_ASSET_BYTES,
  MAX_COVER_BYTES,
  MAX_CAPTION_LEN,
  assetKind,
  type UploadedAsset,
} from '@/lib/uploads'
import { parseLayout, parseRatio } from '@/lib/presentation'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'

const MAX_TAGS = 8
const MAX_TAG_LEN = 30

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type PortfolioStatus = 'draft' | 'published'

/** Messages these actions hand back land straight in the form's error box, so
 *  they are user-facing copy, not log text. `localeFromReferer` is how the rest
 *  of this file already recovers the caller's locale — a Server Action has no
 *  route segment of its own to read it from. */
type Translate = Awaited<ReturnType<typeof getTranslations<'errors'>>>

async function errorMessages(): Promise<Translate> {
  return getTranslations({ locale: await localeFromReferer(), namespace: 'errors' })
}

type ParsedPortfolio = {
  title: string
  description: string | null
  category: string
  project_url: string | null
  tags: string[]
  status: PortfolioStatus
  layout: string
}

function parsePortfolioForm(
  formData: FormData,
  t: Translate
): { error: string } | ParsedPortfolio {
  const title = ((formData.get('title') as string) ?? '').trim()
  const description = ((formData.get('description') as string) ?? '').trim() || null
  const category = ((formData.get('category') as string) ?? '').trim().toLowerCase()
  const projectUrlRaw = ((formData.get('project_url') as string) ?? '').trim()
  const tagsRaw = (formData.get('tags') as string) ?? ''
  const status: PortfolioStatus = formData.get('status') === 'draft' ? 'draft' : 'published'
  // Unknown values fall back to 'gallery' rather than erroring — the preset is
  // presentation, and a bad value should not block someone saving their work.
  const layout = parseLayout(formData.get('layout'))

  if (!title) return { error: t('title_required') }
  if (title.length > 120) return { error: t('title_too_long') }
  if (!CATEGORY_KEYS.includes(category)) {
    return { error: t('category_invalid') }
  }
  if (description && description.length > 2000) {
    return { error: t('description_too_long') }
  }

  let project_url: string | null = null
  if (projectUrlRaw) {
    try {
      const u = new URL(projectUrlRaw)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol')
      project_url = u.toString()
    } catch {
      return { error: t('url_invalid') }
    }
  }

  const tags = Array.from(
    new Set(
      tagsRaw
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .filter((t) => t.length <= MAX_TAG_LEN)
    )
  ).slice(0, MAX_TAGS)

  return { title, description, category, project_url, tags, status, layout }
}

/**
 * Storage keys arrive from the browser now that uploads go straight to Supabase
 * (see upload-client.ts), so every one is untrusted input. A key is only
 * accepted inside the caller's own `${user.id}/` folder — the same boundary the
 * bucket policies in 0004_portfolio_crud.sql enforce on the write itself.
 */
function ownedPath(path: unknown, userId: string): string | null {
  if (typeof path !== 'string' || !path) return null
  if (path.includes('..') || path.startsWith('/')) return null
  return path.startsWith(`${userId}/`) ? path : null
}

/** Public URL for a key, derived here rather than trusting the one the client
 *  sent — otherwise the `url` column could be pointed anywhere. */
function publicUrlFor(supabase: SupabaseServer, path: string): string {
  return supabase.storage.from('portfolios').getPublicUrl(path).data.publicUrl
}

/** Cover picked in this submission, or null to leave the saved one alone.
 *
 *  The type and size are read back from Storage rather than taken from the
 *  form. The browser checks them before uploading, but a Server Action is
 *  reachable by direct POST — without this, any object already in the caller's
 *  own folder (a 50MB clip, a ZIP) could be installed as the cover, and the
 *  cover is what the card, the OG image and the sitemap all point at.
 *
 *  Dimensions are range-checked here as well as by the CHECK constraint in
 *  0005_media_dimensions.sql. */
async function parseCover(
  supabase: SupabaseServer,
  formData: FormData,
  userId: string,
  t: Translate
): Promise<{ error: string } | { url: string; width: number | null; height: number | null } | null> {
  const path = ownedPath(formData.get('thumbnail_path'), userId)
  if (!path) return null

  const slash = path.lastIndexOf('/')
  const { data: found } = await supabase.storage
    .from('portfolios')
    .list(path.slice(0, slash), { search: path.slice(slash + 1), limit: 1 })

  const object = found?.[0]
  if (!object) return { error: t('cover_missing') }

  const mimeType = (object.metadata?.mimetype as string | undefined) ?? ''
  const size = Number(object.metadata?.size ?? 0)
  if (!(COVER_IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return { error: t('cover_type') }
  }
  if (size > MAX_COVER_BYTES) {
    return { error: t('cover_size') }
  }

  const width = Number(formData.get('thumbnail_width'))
  const height = Number(formData.get('thumbnail_height'))
  const valid = (n: number) => Number.isInteger(n) && n > 0 && n <= 30000
  const sized = valid(width) && valid(height)

  return {
    url: publicUrlFor(supabase, path),
    width: sized ? width : null,
    height: sized ? height : null,
  }
}

/** Attachments as the uploader left them, re-validated field by field. Order in
 *  the array is the order they render in; `set_portfolio_assets` derives
 *  `position` from it.
 *
 *  `mime_type` and `size_bytes` are the client's claim about an object it did
 *  upload — verifying each one against Storage would cost a round-trip per
 *  attachment. The bucket's own `allowed_mime_types` / `file_size_limit`
 *  (0007_upload_hardening.sql) guarantee that whatever is actually there is
 *  within the allowlist, so a false claim can only mislabel a permitted file —
 *  a player rendered for the wrong kind, not an arbitrary file served. The
 *  cover, which carries far more weight, is checked properly in parseCover. */
function parseAssets(
  supabase: SupabaseServer,
  formData: FormData,
  userId: string
): UploadedAsset[] {
  const raw = formData.get('assets')
  if (typeof raw !== 'string' || !raw) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  const out: UploadedAsset[] = []
  const seen = new Set<string>()

  for (const entry of parsed) {
    if (out.length >= MAX_ASSETS) break
    if (!entry || typeof entry !== 'object') continue

    const item = entry as Record<string, unknown>
    const path = ownedPath(item.storage_path, userId)
    if (!path || seen.has(path)) continue

    const mime = typeof item.mime_type === 'string' ? item.mime_type : ''
    if (!(ASSET_TYPES as readonly string[]).includes(mime)) continue

    const size = Number(item.size_bytes)
    if (!Number.isFinite(size) || size < 0 || size > MAX_ASSET_BYTES) continue

    const dimension = (value: unknown) => {
      const n = Number(value)
      return Number.isInteger(n) && n > 0 && n <= 30000 ? n : null
    }

    seen.add(path)
    out.push({
      url: publicUrlFor(supabase, path),
      storage_path: path,
      kind: assetKind(mime),
      mime_type: mime,
      size_bytes: Math.round(size),
      width: dimension(item.width),
      height: dimension(item.height),
      caption: typeof item.caption === 'string' ? item.caption.trim().slice(0, MAX_CAPTION_LEN) : '',
      ratio: parseRatio(item.ratio),
    })
  }

  return out
}

export async function createPortfolio(formData: FormData) {
  const supabase = await createClient()
  const t = await errorMessages()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t('not_authenticated') }

  const parsed = parsePortfolioForm(formData, t)
  if ('error' in parsed) return parsed

  const cover = await parseCover(supabase, formData, user.id, t)
  if (cover && 'error' in cover) return cover
  const assets = parseAssets(supabase, formData, user.id)

  const { data: inserted, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      project_url: parsed.project_url,
      status: parsed.status,
      layout: parsed.layout,
      thumbnail_url: cover?.url ?? null,
      thumbnail_width: cover?.width ?? null,
      thumbnail_height: cover?.height ?? null,
      thumbnail_ratio: parseRatio(formData.get('thumbnail_ratio')),
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: error?.message ?? t('create_failed') }
  }

  if (parsed.tags.length > 0) {
    await supabase.rpc('set_portfolio_tags', {
      p_portfolio_id: inserted.id,
      p_tags: parsed.tags,
    })
  }

  if (assets.length > 0) {
    const { error: assetError } = await supabase.rpc('set_portfolio_assets', {
      p_portfolio_id: inserted.id,
      p_assets: assets,
    })
    if (assetError) return { error: assetError.message }
  }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}`)
  revalidatePath(`/${locale}/explore`)
  revalidatePath(`/${locale}/dashboard`)
  redirect(`/${locale}/portfolio/${inserted.id}`)
}

export async function updatePortfolio(formData: FormData) {
  const supabase = await createClient()
  const t = await errorMessages()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t('not_authenticated') }

  const id = (formData.get('id') as string) ?? ''
  if (!id) return { error: t('missing_id') }

  const parsed = parsePortfolioForm(formData, t)
  if ('error' in parsed) return parsed

  const update: Record<string, unknown> = {
    title: parsed.title,
    description: parsed.description,
    category: parsed.category,
    project_url: parsed.project_url,
    status: parsed.status,
    layout: parsed.layout,
    // Always sent, so the creator can reframe a cover without re-uploading it.
    thumbnail_ratio: parseRatio(formData.get('thumbnail_ratio')),
    updated_at: new Date().toISOString(),
  }

  // No new cover in this submission means the saved one stays; replacing it
  // also replaces its stored size, so the card never reserves the old shape.
  const cover = await parseCover(supabase, formData, user.id, t)
  if (cover && 'error' in cover) return cover
  if (cover) {
    update.thumbnail_url = cover.url
    update.thumbnail_width = cover.width
    update.thumbnail_height = cover.height
  }

  // RLS restricts updates to the owner; the user_id filter is defense in depth.
  const { error } = await supabase
    .from('portfolios')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Replaces the portfolio's tag links (empty array clears them).
  const { error: tagError } = await supabase.rpc('set_portfolio_tags', {
    p_portfolio_id: id,
    p_tags: parsed.tags,
  })
  if (tagError) return { error: tagError.message }

  const { error: assetError } = await supabase.rpc('set_portfolio_assets', {
    p_portfolio_id: id,
    p_assets: parseAssets(supabase, formData, user.id),
  })
  if (assetError) return { error: assetError.message }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}/portfolio/${id}`)
  revalidatePath(`/${locale}/dashboard`)
  redirect(`/${locale}/portfolio/${id}`)
}

/**
 * Publish / unpublish from the studio list, without a round-trip through the
 * edit form. Returns instead of redirecting so the row can update in place.
 */
export async function setPortfolioStatus(formData: FormData) {
  const supabase = await createClient()
  const t = await errorMessages()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t('not_authenticated') }

  const id = (formData.get('id') as string) ?? ''
  if (!id) return { error: t('missing_id') }

  const status: PortfolioStatus = formData.get('status') === 'draft' ? 'draft' : 'published'

  const { error } = await supabase
    .from('portfolios')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}`)
  revalidatePath(`/${locale}/explore`)
  revalidatePath(`/${locale}/dashboard`)
  revalidatePath(`/${locale}/portfolio/${id}`)
  return { status }
}

export async function deletePortfolio(formData: FormData) {
  const supabase = await createClient()
  const t = await errorMessages()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: t('not_authenticated') }

  const id = (formData.get('id') as string) ?? ''
  if (!id) return { error: t('missing_id') }

  // Collect the objects first — the rows are about to go, and with them the
  // only record of what this work was storing.
  const { data: assets } = await supabase
    .from('portfolio_assets')
    .select('storage_path')
    .eq('portfolio_id', id)
    .eq('user_id', user.id)

  // delete_portfolio verifies ownership and removes tag links + the row.
  // portfolio_assets rows go with it via ON DELETE CASCADE.
  const { error } = await supabase.rpc('delete_portfolio', { p_id: id })
  if (error) return { error: error.message }

  const paths = (assets ?? [])
    .map((a) => a.storage_path)
    .filter((p): p is string => typeof p === 'string' && p.startsWith(`${user.id}/`))
  if (paths.length > 0) {
    // Best-effort: an orphaned object is not worth failing a delete the user
    // already saw succeed.
    await supabase.storage.from('portfolios').remove(paths)
  }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}`)
  revalidatePath(`/${locale}/explore`)
  revalidatePath(`/${locale}/dashboard`)
  redirect(`/${locale}/dashboard`)
}
