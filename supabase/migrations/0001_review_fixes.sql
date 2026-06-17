-- ============================================================================
-- Review fixes: atomic views, profile stats, full-text search, username unique.
--
-- Run this in the Supabase SQL editor (or `supabase db push`). It is idempotent
-- — safe to run more than once.
--
-- NOTE on id types: the app passes route ids as strings and Supabase casts
-- them. The functions below assume `portfolios.id` and `profiles.id` are uuid.
-- If your columns are bigint/text, change the argument types to match.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Atomic view increment (fixes lost-update race + the "never fires" bug).
--    Called from app/[locale]/portfolio/[id]/page.tsx via supabase.rpc().
--    SECURITY DEFINER so anonymous visitors can bump the counter even though
--    RLS would normally block writes to portfolios.
-- ----------------------------------------------------------------------------
create or replace function public.increment_portfolio_views(p_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.portfolios
     set views = coalesce(views, 0) + 1
   where id = p_id;
$$;

grant execute on function public.increment_portfolio_views(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 2. Profile stats aggregate (replaces select('*') + JS sum over every row).
--    Returns one row: total_views, total_likes, project_count.
-- ----------------------------------------------------------------------------
create or replace function public.get_profile_stats(p_user_id uuid)
returns table (total_views bigint, total_likes bigint, project_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(views), 0)::bigint  as total_views,
    coalesce(sum(likes), 0)::bigint  as total_likes,
    count(*)::bigint                 as project_count
  from public.portfolios
  where user_id = p_user_id;
$$;

grant execute on function public.get_profile_stats(uuid) to anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. Full-text search (replaces the unindexed `ilike %x%` full-table scan).
--    A generated tsvector column + GIN index. The client queries it with
--    .textSearch('fts', q, { type: 'websearch', config: 'simple' }) — keep the
--    'simple' config in sync on both sides.
-- ----------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists fts tsvector
  generated always as (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(category, '')
    )
  ) stored;

create index if not exists portfolios_fts_idx
  on public.portfolios using gin (fts);

-- ----------------------------------------------------------------------------
-- 4. Username uniqueness (the real guard behind the app-level check; closes the
--    signup TOCTOU race). Partial index so multiple NULL usernames are allowed.
-- ----------------------------------------------------------------------------
create unique index if not exists profiles_username_key
  on public.profiles (username)
  where username is not null;

-- ============================================================================
-- RLS / Storage checklist (verify in the dashboard — not enforced by this file)
-- ----------------------------------------------------------------------------
--  [ ] RLS enabled on public.portfolios and public.profiles.
--  [ ] portfolios: public SELECT policy (anon) for published rows only.
--  [ ] portfolios: INSERT/UPDATE/DELETE restricted to auth.uid() = user_id.
--  [ ] profiles:   SELECT public; UPDATE restricted to auth.uid() = id.
--  [ ] Storage bucket "avatars": writes scoped to a folder named after the
--      user id (uploads use `${user.id}/<uuid>.<ext>`). Example policy:
--        (storage.foldername(name))[1] = auth.uid()::text
--  [ ] get_email_by_username RPC: confirm it only returns an email for login
--      and is acceptable for your enumeration threat model.
-- ============================================================================
