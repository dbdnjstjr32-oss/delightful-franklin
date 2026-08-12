#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { ConfigError, authedClient, publicClient, siteUrl } from './client.js'

/** Categories and layouts are duplicated from src/lib in the app rather than
 *  imported: this package builds standalone (its own tsconfig, its own deps)
 *  so it can be run without the Next.js app installed. Keep them in step with
 *  src/lib/categories.ts and src/lib/presentation.ts. */
const CATEGORIES = [
  'development',
  'design',
  '3d',
  'video',
  'photography',
  'writing',
  'music',
] as const
const LAYOUTS = ['gallery', 'deck', 'case_study'] as const
const STATUSES = ['draft', 'published'] as const

const CARD_COLUMNS =
  'id, title, category, views, likes, thumbnail_url, created_at, profiles(username, display_name)'

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean }

function ok(payload: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }] }
}

function fail(message: string): ToolResult {
  return { content: [{ type: 'text', text: message }], isError: true }
}

/** Every tool body runs through this so a thrown ConfigError becomes readable
 *  setup guidance instead of an opaque stack trace in the client. */
async function guard(run: () => Promise<ToolResult>): Promise<ToolResult> {
  try {
    return await run()
  } catch (error) {
    if (error instanceof ConfigError) return fail(error.message)
    return fail(error instanceof Error ? error.message : String(error))
  }
}

const workUrl = (id: string, locale = 'ko') => `${siteUrl}/${locale}/portfolio/${id}`

const server = new McpServer({ name: 'showcase', version: '0.1.0' })

// ---------------------------------------------------------------------------
// Read tools. These use the anonymous client, so they return exactly what a
// logged-out visitor can see — drafts stay invisible even to their own author.
// ---------------------------------------------------------------------------

server.registerTool(
  'search_works',
  {
    title: 'Search works',
    description:
      'Search published portfolio works by keyword, category, or popularity. ' +
      'Returns published works only. Use get_work for the full detail of one result.',
    inputSchema: {
      query: z.string().optional().describe('Full-text search over title, description and category'),
      category: z.enum(CATEGORIES).optional(),
      sort: z.enum(['latest', 'trending']).default('latest'),
      limit: z.number().int().min(1).max(50).default(12),
    },
  },
  async ({ query, category, sort, limit }) =>
    guard(async () => {
      let request = publicClient().from('portfolios').select(CARD_COLUMNS).eq('status', 'published')

      if (query?.trim()) {
        // Matches the app's explore search: the generated `fts` column with the
        // 'simple' config (0001_review_fixes.sql).
        request = request.textSearch('fts', query.trim(), { type: 'websearch', config: 'simple' })
      }
      if (category) request = request.eq('category', category)

      request =
        sort === 'trending'
          ? request.order('likes', { ascending: false }).order('views', { ascending: false })
          : request.order('created_at', { ascending: false })

      const { data, error } = await request.limit(limit)
      if (error) return fail(error.message)

      return ok(
        (data ?? []).map((row) => {
          const { profiles, ...work } = row as Record<string, unknown> & {
            profiles?: { username?: string; display_name?: string } | null
          }
          return {
            ...work,
            creator: profiles?.display_name ?? profiles?.username ?? null,
            url: workUrl(String(work.id)),
          }
        })
      )
    })
)

server.registerTool(
  'get_work',
  {
    title: 'Get a work',
    description:
      'Full detail for one published work: description, tags, layout, and every attachment ' +
      'in the order the creator arranged them.',
    inputSchema: { id: z.string().uuid() },
  },
  async ({ id }) =>
    guard(async () => {
      const { data, error } = await publicClient()
        .from('portfolios')
        .select(
          `id, title, description, category, project_url, status, layout, views, likes,
           thumbnail_url, thumbnail_ratio, created_at, updated_at,
           profiles(username, display_name, bio, website),
           portfolio_tags(tags(name)),
           portfolio_assets(url, kind, mime_type, caption, ratio, position)`
        )
        .eq('id', id)
        .order('position', { referencedTable: 'portfolio_assets', ascending: true })
        .maybeSingle()

      if (error) return fail(error.message)
      if (!data) return fail('No published work with that id. It may be a draft, or deleted.')

      // PostgREST types a nested embed as an array even when it resolves to a
      // single row, so accept both shapes rather than casting through the
      // generated type.
      type TagName = { name: string }
      const { portfolio_tags, portfolio_assets, ...work } = data as unknown as Record<
        string,
        unknown
      > & {
        portfolio_tags?: Array<{ tags: TagName | TagName[] | null }> | null
        portfolio_assets?: unknown[] | null
      }

      return ok({
        ...work,
        tags: (portfolio_tags ?? [])
          .flatMap((link) => (Array.isArray(link.tags) ? link.tags : [link.tags]))
          .map((tag) => tag?.name)
          .filter(Boolean),
        attachments: portfolio_assets ?? [],
        url: workUrl(id),
      })
    })
)

server.registerTool(
  'get_creator',
  {
    title: 'Get a creator',
    description: 'A creator’s public profile and their published works, by username.',
    inputSchema: { username: z.string().min(1) },
  },
  async ({ username }) =>
    guard(async () => {
      const supabase = publicClient()
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, bio, website, avatar_url, created_at')
        .eq('username', username)
        .maybeSingle()

      if (error) return fail(error.message)
      if (!profile) return fail(`No creator with the username "${username}".`)

      const { data: works } = await supabase
        .from('portfolios')
        .select('id, title, category, views, likes, created_at')
        .eq('user_id', profile.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })

      return ok({
        ...profile,
        profile_url: `${siteUrl}/ko/u/${profile.username}`,
        works: (works ?? []).map((w) => ({ ...w, url: workUrl(w.id) })),
      })
    })
)

server.registerTool(
  'list_categories',
  {
    title: 'List categories',
    description: 'The category keys a work can be filed under.',
    inputSchema: {},
  },
  async () => ok({ categories: CATEGORIES, layouts: LAYOUTS })
)

// ---------------------------------------------------------------------------
// Write tools. These authenticate as a real user, so RLS applies exactly as it
// does in the browser — they can only ever touch that user's own rows.
// ---------------------------------------------------------------------------

server.registerTool(
  'list_my_works',
  {
    title: 'List my works',
    description:
      'The signed-in creator’s own works, drafts included. Requires an account token.',
    inputSchema: { status: z.enum(STATUSES).optional().describe('Omit for both') },
  },
  async ({ status }) =>
    guard(async () => {
      const { client, userId } = await authedClient()
      let request = client
        .from('portfolios')
        .select('id, title, category, status, layout, views, likes, created_at, updated_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (status) request = request.eq('status', status)

      const { data, error } = await request
      if (error) return fail(error.message)
      return ok((data ?? []).map((w) => ({ ...w, url: workUrl(w.id) })))
    })
)

const workFields = {
  title: z.string().min(1).max(120),
  category: z.enum(CATEGORIES),
  description: z.string().max(2000).optional(),
  project_url: z.string().url().optional(),
  tags: z.array(z.string().max(30)).max(8).optional(),
  status: z.enum(STATUSES).default('draft'),
  layout: z.enum(LAYOUTS).default('gallery'),
}

server.registerTool(
  'create_work',
  {
    title: 'Create a work',
    description:
      'Create a new work. Defaults to a draft, visible only to its author until published. ' +
      'Cannot attach files — upload those through the site; this creates the entry around them.',
    inputSchema: workFields,
  },
  async ({ title, category, description, project_url, tags, status, layout }) =>
    guard(async () => {
      const { client, userId } = await authedClient()

      const { data, error } = await client
        .from('portfolios')
        .insert({
          user_id: userId,
          title,
          category,
          description: description ?? null,
          project_url: project_url ?? null,
          status,
          layout,
        })
        .select('id, title, status')
        .single()

      if (error) return fail(error.message)

      if (tags?.length) {
        const { error: tagError } = await client.rpc('set_portfolio_tags', {
          p_portfolio_id: data.id,
          p_tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
        })
        if (tagError) {
          return fail(`Work created (${data.id}) but tags failed: ${tagError.message}`)
        }
      }

      return ok({ ...data, url: workUrl(data.id), edit_url: `${workUrl(data.id)}/edit` })
    })
)

server.registerTool(
  'update_work',
  {
    title: 'Update a work',
    description:
      'Change fields on one of your own works. Only the fields you pass are touched. ' +
      'Passing tags replaces the whole set; pass an empty array to clear them.',
    inputSchema: {
      id: z.string().uuid(),
      title: workFields.title.optional(),
      category: workFields.category.optional(),
      description: z.string().max(2000).optional(),
      project_url: z.string().url().optional(),
      tags: z.array(z.string().max(30)).max(8).optional(),
      layout: z.enum(LAYOUTS).optional(),
    },
  },
  async ({ id, tags, ...fields }) =>
    guard(async () => {
      const { client, userId } = await authedClient()

      const update = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => value !== undefined)
      )

      if (Object.keys(update).length > 0) {
        update.updated_at = new Date().toISOString()
        // RLS already restricts this to the owner; the user_id filter makes the
        // intent explicit and turns a policy mistake into zero rows, not a leak.
        const { error } = await client
          .from('portfolios')
          .update(update)
          .eq('id', id)
          .eq('user_id', userId)
        if (error) return fail(error.message)
      }

      if (tags) {
        const { error } = await client.rpc('set_portfolio_tags', {
          p_portfolio_id: id,
          p_tags: tags.map((t) => t.trim().toLowerCase()).filter(Boolean),
        })
        if (error) return fail(error.message)
      }

      return ok({ id, updated: Object.keys(update), tags_replaced: !!tags, url: workUrl(id) })
    })
)

server.registerTool(
  'set_work_status',
  {
    title: 'Publish or unpublish',
    description:
      'Publish one of your drafts, or pull a published work back to draft. ' +
      'Drafts are visible only to their author.',
    inputSchema: { id: z.string().uuid(), status: z.enum(STATUSES) },
  },
  async ({ id, status }) =>
    guard(async () => {
      const { client, userId } = await authedClient()
      const { data, error } = await client
        .from('portfolios')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', userId)
        .select('id, title, status')

      if (error) return fail(error.message)
      if (!data?.length) return fail('No work of yours with that id.')
      return ok({ ...data[0], url: workUrl(id) })
    })
)

server.registerTool(
  'delete_work',
  {
    title: 'Delete a work',
    description:
      'Permanently delete one of your own works, along with its tags and attachment records. ' +
      'This cannot be undone — confirm with the user before calling it.',
    inputSchema: { id: z.string().uuid() },
  },
  async ({ id }) =>
    guard(async () => {
      const { client } = await authedClient()
      // delete_portfolio is SECURITY DEFINER and re-checks ownership itself.
      const { error } = await client.rpc('delete_portfolio', { p_id: id })
      if (error) return fail(error.message)
      return ok({ deleted: id })
    })
)

const transport = new StdioServerTransport()
await server.connect(transport)
