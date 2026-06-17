'use server'

import { createClient } from '@/lib/supabase/server'
import { localeFromReferer } from '@/lib/locale'
import { CATEGORY_KEYS } from '@/lib/categories'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB
const MAX_TAGS = 8
const MAX_TAG_LEN = 30

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

type ParsedPortfolio = {
  title: string
  description: string | null
  category: string
  project_url: string | null
  tags: string[]
}

function parsePortfolioForm(formData: FormData): { error: string } | ParsedPortfolio {
  const title = ((formData.get('title') as string) ?? '').trim()
  const description = ((formData.get('description') as string) ?? '').trim() || null
  const category = ((formData.get('category') as string) ?? '').trim().toLowerCase()
  const projectUrlRaw = ((formData.get('project_url') as string) ?? '').trim()
  const tagsRaw = (formData.get('tags') as string) ?? ''

  if (!title) return { error: 'Title is required.' }
  if (title.length > 120) return { error: 'Title must be 120 characters or fewer.' }
  if (!CATEGORY_KEYS.includes(category)) {
    return { error: 'Please choose a valid category.' }
  }
  if (description && description.length > 2000) {
    return { error: 'Description must be 2000 characters or fewer.' }
  }

  let project_url: string | null = null
  if (projectUrlRaw) {
    try {
      const u = new URL(projectUrlRaw)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('bad protocol')
      project_url = u.toString()
    } catch {
      return { error: 'Project URL must be a valid http(s) link.' }
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

  return { title, description, category, project_url, tags }
}

async function uploadThumbnail(
  supabase: SupabaseServer,
  userId: string,
  file: File
): Promise<{ error: string } | { url: string }> {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { error: 'Thumbnail must be a PNG, JPEG, WebP, or GIF image.' }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { error: 'Thumbnail must be 10MB or smaller.' }
  }
  const ext = (file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from('portfolios')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) {
    return { error: 'Error uploading image: ' + error.message }
  }
  const { data } = supabase.storage.from('portfolios').getPublicUrl(path)
  return { url: data.publicUrl }
}

export async function createPortfolio(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = parsePortfolioForm(formData)
  if ('error' in parsed) return parsed

  let thumbnail_url: string | null = null
  const thumb = formData.get('thumbnail') as File | null
  if (thumb && thumb.size > 0) {
    const up = await uploadThumbnail(supabase, user.id, thumb)
    if ('error' in up) return up
    thumbnail_url = up.url
  }

  const { data: inserted, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      project_url: parsed.project_url,
      thumbnail_url,
    })
    .select('id')
    .single()

  if (error || !inserted) {
    return { error: error?.message ?? 'Could not create portfolio.' }
  }

  if (parsed.tags.length > 0) {
    await supabase.rpc('set_portfolio_tags', {
      p_portfolio_id: inserted.id,
      p_tags: parsed.tags,
    })
  }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}`)
  revalidatePath(`/${locale}/explore`)
  redirect(`/${locale}/portfolio/${inserted.id}`)
}

export async function updatePortfolio(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string) ?? ''
  if (!id) return { error: 'Missing portfolio id.' }

  const parsed = parsePortfolioForm(formData)
  if ('error' in parsed) return parsed

  const update: Record<string, unknown> = {
    title: parsed.title,
    description: parsed.description,
    category: parsed.category,
    project_url: parsed.project_url,
    updated_at: new Date().toISOString(),
  }

  const thumb = formData.get('thumbnail') as File | null
  if (thumb && thumb.size > 0) {
    const up = await uploadThumbnail(supabase, user.id, thumb)
    if ('error' in up) return up
    update.thumbnail_url = up.url
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

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}/portfolio/${id}`)
  redirect(`/${locale}/portfolio/${id}`)
}

export async function deletePortfolio(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const id = (formData.get('id') as string) ?? ''
  if (!id) return { error: 'Missing portfolio id.' }

  // delete_portfolio verifies ownership and removes tag links + the row.
  const { error } = await supabase.rpc('delete_portfolio', { p_id: id })
  if (error) return { error: error.message }

  const locale = await localeFromReferer()
  revalidatePath(`/${locale}/dashboard`)
  redirect(`/${locale}/dashboard`)
}
