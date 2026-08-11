// RLS integration test — proves the policies in 0002/0003/0004 actually deny
// cross-user writes and unauthenticated mutations. This is a REAL test: it
// creates two throwaway users, exercises the policies against a live project,
// and cleans up. It cannot be faked — every assertion hits the database.
//
// Run:  node supabase/tests/rls.test.mjs        (or `npm run test:rls`)
// Needs (in .env.local or the shell):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY        <- server-only, used to create/clean users
//
// Point this at a STAGING project, not production.

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !anonKey || !serviceKey) {
  console.error(
    'Missing env. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.'
  )
  process.exit(2)
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

let passed = 0
let failed = 0
function check(name, ok, detail = '') {
  if (ok) {
    passed++
    console.log(`  PASS  ${name}`)
  } else {
    failed++
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const PASSWORD = 'Test123456!'
const stamp = Date.now()
const users = {}

async function makeUser(label) {
  const email = `rls-${label}-${stamp}@example.test`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw new Error(`createUser ${label}: ${error.message}`)
  // Ensure a profile row exists (in case no trigger).
  await admin.from('profiles').upsert({ id: data.user.id }).select('id')
  return { id: data.user.id, email }
}

async function clientFor(email) {
  const c = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn ${email}: ${error.message}`)
  return c
}

async function main() {
  console.log('RLS integration test\n')

  users.a = await makeUser('a')
  users.b = await makeUser('b')
  const clientA = await clientFor(users.a.email)
  const clientB = await clientFor(users.b.email)
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })

  // 1. Owner can insert their own portfolio.
  const ins = await clientA
    .from('portfolios')
    .insert({ user_id: users.a.id, title: 'RLS test piece', category: 'design' })
    .select('id, title')
    .single()
  check('owner can INSERT own portfolio', !ins.error && !!ins.data, ins.error?.message)
  const portfolioId = ins.data?.id

  // 2. Anyone can read it (public SELECT).
  const read = await anon.from('portfolios').select('id').eq('id', portfolioId).maybeSingle()
  check('anon can SELECT public portfolio', !read.error && !!read.data, read.error?.message)

  // 3. A different user cannot UPDATE it (RLS → 0 rows changed).
  await clientB.from('portfolios').update({ title: 'HACKED' }).eq('id', portfolioId)
  const afterUpd = await admin.from('portfolios').select('title').eq('id', portfolioId).single()
  check('non-owner UPDATE is blocked', afterUpd.data?.title === 'RLS test piece', `title=${afterUpd.data?.title}`)

  // 4. A different user cannot DELETE it.
  await clientB.from('portfolios').delete().eq('id', portfolioId)
  const afterDel = await admin.from('portfolios').select('id').eq('id', portfolioId).maybeSingle()
  check('non-owner DELETE is blocked', !!afterDel.data, 'row was deleted')

  // 5. Anonymous cannot toggle a like (RPC requires auth.uid()).
  const likeAnon = await anon.rpc('toggle_like', { p_portfolio_id: portfolioId })
  check('anon toggle_like is rejected', !!likeAnon.error, 'expected an error')

  // 6. Authenticated user CAN toggle a like.
  const likeB = await clientB.rpc('toggle_like', { p_portfolio_id: portfolioId })
  check('authed toggle_like works', !likeB.error && typeof likeB.data === 'boolean', likeB.error?.message)

  // 7. A user cannot edit someone else's profile.
  await clientB.from('profiles').update({ bio: 'pwned' }).eq('id', users.a.id)
  const profA = await admin.from('profiles').select('bio').eq('id', users.a.id).single()
  check('non-owner profile UPDATE is blocked', (profA.data?.bio ?? null) !== 'pwned')

  // 8. Anonymous cannot insert a portfolio.
  const anonIns = await anon.from('portfolios').insert({ title: 'x', category: 'design' }).select('id')
  check('anon INSERT portfolio is blocked', !!anonIns.error || (anonIns.data?.length ?? 0) === 0)

  // --- 0006/0007: drafts and attachments ------------------------------------

  // 9. A draft is invisible to everyone but its owner.
  const draft = await clientA
    .from('portfolios')
    .insert({ user_id: users.a.id, title: 'RLS draft', category: 'design', status: 'draft' })
    .select('id')
    .single()
  const draftId = draft.data?.id
  check('owner can INSERT a draft', !draft.error && !!draftId, draft.error?.message)

  const anonDraft = await anon.from('portfolios').select('id').eq('id', draftId).maybeSingle()
  check('anon cannot SELECT a draft', !anonDraft.data)

  const bDraft = await clientB.from('portfolios').select('id').eq('id', draftId).maybeSingle()
  check('another user cannot SELECT a draft', !bDraft.data)

  const ownDraft = await clientA.from('portfolios').select('id').eq('id', draftId).maybeSingle()
  check('owner CAN SELECT their own draft', !!ownDraft.data)

  // 10. Only the owner may attach files, and only to their own work.
  const attach = await clientA.rpc('set_portfolio_assets', {
    p_portfolio_id: draftId,
    p_assets: [
      { url: 'https://example.test/a.png', storage_path: `${users.a.id}/a.png`, kind: 'image', mime_type: 'image/png' },
    ],
  })
  check('owner can set attachments', !attach.error, attach.error?.message)

  const stealAttach = await clientB.rpc('set_portfolio_assets', {
    p_portfolio_id: draftId,
    p_assets: [{ url: 'https://evil.test/x.png', storage_path: `${users.b.id}/x.png`, kind: 'image' }],
  })
  check('non-owner set_portfolio_assets is rejected', !!stealAttach.error)

  const forgedAsset = await clientB
    .from('portfolio_assets')
    .insert({ portfolio_id: draftId, user_id: users.a.id, url: 'https://evil.test/x.png', kind: 'image' })
    .select('id')
  check(
    'non-owner INSERT into portfolio_assets is blocked',
    !!forgedAsset.error || (forgedAsset.data?.length ?? 0) === 0
  )

  const wipeAssets = await clientB.from('portfolio_assets').delete().eq('portfolio_id', draftId).select('id')
  check("non-owner cannot DELETE another user's attachments", (wipeAssets.data?.length ?? 0) === 0)

  // 11. A draft's attachment rows are hidden along with the draft.
  const anonAssets = await anon.from('portfolio_assets').select('id').eq('portfolio_id', draftId)
  check("anon cannot SELECT a draft's attachments", (anonAssets.data?.length ?? 0) === 0)

  // 12. Nobody else can publish someone's draft.
  await clientB.from('portfolios').update({ status: 'published' }).eq('id', draftId)
  const stillDraft = await admin.from('portfolios').select('status').eq('id', draftId).single()
  check('non-owner cannot publish a draft', stillDraft.data?.status === 'draft', `status=${stillDraft.data?.status}`)

  // 13. The view counter ignores drafts (it is SECURITY DEFINER, so it sees past RLS).
  await anon.rpc('increment_portfolio_views', { p_id: draftId, p_viewer: 'rls-test' })
  const draftViews = await admin.from('portfolios').select('views').eq('id', draftId).single()
  check('view counter does not increment a draft', (draftViews.data?.views ?? 0) === 0, `views=${draftViews.data?.views}`)

  // 14. Public profile stats exclude drafts.
  const statsRes = await anon.rpc('get_profile_stats', { p_user_id: users.a.id })
  const statsRow = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data
  check(
    'get_profile_stats counts published work only',
    Number(statsRow?.project_count ?? -1) === 1,
    `project_count=${statsRow?.project_count}`
  )

  // 15. The bucket declares what it accepts (0007), so a crafted upload cannot
  //     turn the public bucket into a general file host.
  const evil = await clientA.storage
    .from('portfolios')
    .upload(`${users.a.id}/${crypto.randomUUID()}.html`, new Blob(['<script>x</script>']), {
      contentType: 'text/html',
    })
  check('storage rejects a disallowed MIME type', !!evil.error, evil.error?.message ?? 'upload succeeded')

  // Teardown.
  await admin.from('portfolio_assets').delete().eq('portfolio_id', draftId)
  await admin.from('portfolios').delete().eq('id', draftId)
  await admin.from('portfolios').delete().eq('id', portfolioId)
  await admin.auth.admin.deleteUser(users.a.id)
  await admin.auth.admin.deleteUser(users.b.id)

  console.log(`\n${passed} passed, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('\nTest harness error:', e.message)
  process.exit(1)
})
