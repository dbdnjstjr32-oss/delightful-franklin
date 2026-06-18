// Demo seed: creates a handful of artists with varied works so the site looks
// populated. Self-contained — creates storage buckets, creates auth users,
// uploads avatars + CATEGORY-MATCHED cover images to Supabase Storage (so
// next/image's tightened remotePatterns keeps working), and inserts portfolios
// + tags + view/like counts.
//
// Run:  node supabase/seed.mjs        (or `npm run seed`)
// Needs in .env.local:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   <- Dashboard → Project Settings → API → service_role
//
// Idempotent: re-running deletes each demo artist's existing works and re-seeds,
// so cover images / categories update cleanly without duplicating rows.

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m) env[m[1]] = m[2].trim()
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error('\nMissing SUPABASE_SERVICE_ROLE_KEY (or URL). Add it to .env.local.\n')
  process.exit(2)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PASSWORD = 'DemoArtist!2026'

// Topical cover images per category (keyword-based so they always match).
const CATEGORY_KEYWORDS = {
  development: 'code,programming,screen',
  design: 'ui,design,interface',
  '3d': '3d,render,abstract',
  video: 'film,cinema,camera',
  photography: 'photography,landscape',
  writing: 'writing,book,desk',
  music: 'music,studio,sound',
}

// ---- demo content (categories restricted to the app's valid set) ------------
const ARTISTS = [
  {
    username: 'yujin_motion', display_name: '유진 Yujin', avatar: 12,
    bio: 'Motion designer & 3D artist based in Seoul.', website: 'https://instagram.com/yujin.motion',
    works: [
      { title: 'Aurora — Title Sequence', category: 'video', img: 'aurora', tags: ['motion', 'title', 'aftereffects'], featured: true, views: 18420, likes: 1203 },
      { title: 'Liquid Type Study', category: '3d', img: 'liquidtype', tags: ['3d', 'type', 'houdini'], views: 9210, likes: 642 },
      { title: 'Neon Drive — Loop', category: 'video', img: 'neondrive', tags: ['loop', 'neon'], views: 5120, likes: 318 },
    ],
  },
  {
    username: 'mina_ux', display_name: 'Mina Park', avatar: 5,
    bio: 'Product designer. I make complex things feel obvious.', website: 'https://minapark.design',
    works: [
      { title: 'Fintech Dashboard Redesign', category: 'design', img: 'fintech', tags: ['ui', 'product', 'figma'], featured: true, views: 22310, likes: 1840 },
      { title: 'Onboarding Microinteractions', category: 'design', img: 'onboarding', tags: ['ux', 'motion'], views: 7430, likes: 510 },
      { title: 'Design System — Atlas', category: 'design', img: 'atlas', tags: ['design-system', 'tokens'], views: 11200, likes: 905 },
    ],
  },
  {
    username: 'devkanghyun', display_name: '강현 Kang', avatar: 33,
    bio: 'Full-stack engineer. WebGL, edge, and developer tools.', website: 'https://github.com/kanghyun',
    works: [
      { title: 'Realtime Collab Editor', category: 'development', img: 'collab', tags: ['websocket', 'crdt', 'react'], featured: true, views: 30150, likes: 2410 },
      { title: 'WebGL Particle Playground', category: 'development', img: 'particles', tags: ['webgl', 'shaders'], views: 14820, likes: 1190 },
      { title: 'Edge Image Pipeline', category: 'development', img: 'edge', tags: ['edge', 'performance'], views: 6650, likes: 402 },
    ],
  },
  {
    username: 'sora_lens', display_name: 'Sora Lim', avatar: 9,
    bio: 'Photographer chasing soft light and quiet cities.', website: 'https://soralim.photo',
    works: [
      { title: 'Tokyo, Blue Hour', category: 'photography', img: 'tokyo', tags: ['street', 'night', 'city'], featured: true, views: 16740, likes: 1502 },
      { title: 'Portraits in Window Light', category: 'photography', img: 'portraits', tags: ['portrait', 'film'], views: 8830, likes: 770 },
      { title: 'Coastline Series', category: 'photography', img: 'coast', tags: ['landscape', 'film'], views: 5410, likes: 388 },
    ],
  },
  {
    username: 'render_ron', display_name: 'Ron Veld', avatar: 51,
    bio: '3D generalist. Hard-surface, lighting, look-dev.', website: 'https://ronveld.art',
    works: [
      { title: 'Brutalist Interior', category: '3d', img: 'brutalist', tags: ['blender', 'architecture', 'lookdev'], views: 12030, likes: 980 },
      { title: 'Sci-Fi Helmet — Hard Surface', category: '3d', img: 'helmet', tags: ['hardsurface', 'blender'], views: 9940, likes: 712 },
      { title: 'Procedural Terrain', category: '3d', img: 'terrain', tags: ['procedural', 'houdini'], views: 4520, likes: 264 },
    ],
  },
  {
    username: 'haru_writes', display_name: '하루 Haru', avatar: 24,
    bio: 'Writer & narrative designer. Worlds, words, and worldbuilding.', website: 'https://haru.ink',
    works: [
      { title: 'The Lighthouse Keeper — Short', category: 'writing', img: 'lighthouse', tags: ['fiction', 'short-story'], views: 7210, likes: 560 },
      { title: 'Branching Dialogue Framework', category: 'writing', img: 'dialogue', tags: ['narrative', 'games'], views: 3980, likes: 221 },
    ],
  },
  {
    username: 'beat_noa', display_name: 'Noa Kim', avatar: 60,
    bio: 'Composer & sound designer for film and games.', website: 'https://noakim.audio',
    works: [
      { title: 'Ambient Score — Drift', category: 'music', img: 'drift', tags: ['ambient', 'score'], views: 6120, likes: 489 },
      { title: 'Game SFX Pack — Arcadia', category: 'music', img: 'arcadia', tags: ['sound-design', 'games'], views: 4310, likes: 277 },
    ],
  },
]

// ---- helpers ----------------------------------------------------------------
async function ensureBucket(id) {
  const { error } = await admin.storage.createBucket(id, { public: true })
  if (error && !/already exists/i.test(error.message)) console.warn(`  bucket ${id}: ${error.message}`)
}

async function fetchImage(u) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch(u, { redirect: 'follow', signal: ctrl.signal })
    if (!res.ok) throw new Error(`fetch ${res.status}`)
    return Buffer.from(await res.arrayBuffer())
  } finally {
    clearTimeout(t)
  }
}

async function uploadImage(bucket, path, buffer) {
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })
  if (error) throw new Error(error.message)
  return admin.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

function lockFor(s) {
  return [...s].reduce((a, c) => a + c.charCodeAt(0), 0)
}

async function getOrCreateUser(email, displayName) {
  const created = await admin.auth.admin.createUser({
    email, password: PASSWORD, email_confirm: true,
    user_metadata: { full_name: displayName },
  })
  if (!created.error) return created.data.user.id
  if (/already.*registered|already exists/i.test(created.error.message)) {
    for (let page = 1; page <= 20; page++) {
      const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 })
      const hit = data.users.find((u) => u.email === email)
      if (hit) return hit.id
      if (data.users.length < 200) break
    }
  }
  throw new Error(created.error.message)
}

async function clearWorks(userId) {
  const { data: existing } = await admin.from('portfolios').select('id').eq('user_id', userId)
  const ids = (existing ?? []).map((r) => r.id)
  if (!ids.length) return
  await admin.from('portfolio_tags').delete().in('portfolio_id', ids)
  try { await admin.from('portfolio_likes').delete().in('portfolio_id', ids) } catch { /* table may not exist */ }
  await admin.from('portfolios').delete().eq('user_id', userId)
}

async function tagIds(names) {
  const ids = []
  for (const raw of names) {
    const name = raw.trim().toLowerCase()
    await admin.from('tags').upsert({ name }, { onConflict: 'name' })
    const { data } = await admin.from('tags').select('id').eq('name', name).maybeSingle()
    if (data?.id != null) ids.push(data.id)
  }
  return ids
}

// ---- run --------------------------------------------------------------------
async function main() {
  console.log('Seeding demo content into', new URL(url).host, '\n')
  await ensureBucket('avatars')
  await ensureBucket('portfolios')

  let artists = 0
  let works = 0

  for (const a of ARTISTS) {
    const email = `demo+${a.username}@showcase.test`
    try {
      const userId = await getOrCreateUser(email, a.display_name)

      let avatar_url = null
      try {
        const buf = await fetchImage(`https://i.pravatar.cc/300?img=${a.avatar}`)
        avatar_url = await uploadImage('avatars', `${userId}/avatar.jpg`, buf)
      } catch (e) {
        console.warn(`  avatar ${a.username}: ${e.message}`)
      }

      const { error: pErr } = await admin.from('profiles').upsert({
        id: userId,
        username: a.username,
        display_name: a.display_name,
        bio: a.bio,
        website: a.website,
        ...(avatar_url ? { avatar_url } : {}),
      })
      if (pErr) { console.warn(`  profile ${a.username}: ${pErr.message}`); continue }
      artists++
      console.log(`✓ artist ${a.display_name} (@${a.username})`)

      // Idempotent: wipe prior works so covers/categories refresh without dupes.
      await clearWorks(userId)

      for (const w of a.works) {
        let thumbnail_url = null
        try {
          const kw = CATEGORY_KEYWORDS[w.category] || 'abstract'
          const buf = await fetchImage(`https://loremflickr.com/1200/800/${kw}?lock=${lockFor(w.img)}`)
          thumbnail_url = await uploadImage('portfolios', `${userId}/${w.img}.jpg`, buf)
        } catch (e) {
          console.warn(`    thumb ${w.title}: ${e.message} (using fallback)`)
        }

        const { data: ins, error: wErr } = await admin
          .from('portfolios')
          .insert({
            user_id: userId,
            title: w.title,
            description: `${w.title} — a ${w.category} piece by ${a.display_name}.`,
            category: w.category,
            project_url: a.website,
            views: w.views ?? 0,
            likes: w.likes ?? 0,
            featured: !!w.featured,
            ...(thumbnail_url ? { thumbnail_url } : {}),
          })
          .select('id')
          .single()
        if (wErr) { console.warn(`    work "${w.title}": ${wErr.message}`); continue }
        works++

        try {
          const ids = await tagIds(w.tags ?? [])
          if (ids.length) {
            await admin.from('portfolio_tags').upsert(ids.map((tag_id) => ({ portfolio_id: ins.id, tag_id })))
          }
        } catch (e) {
          console.warn(`    tags "${w.title}": ${e.message}`)
        }
        console.log(`    • ${w.title} [${w.category}]${thumbnail_url ? '' : ' (fallback cover)'}`)
      }
    } catch (e) {
      console.warn(`✗ artist ${a.username}: ${e.message}`)
    }
  }

  console.log(`\nDone. ${artists} artists, ${works} works seeded.`)
}

main().catch((e) => {
  console.error('Seed failed:', e.message)
  process.exit(1)
})
