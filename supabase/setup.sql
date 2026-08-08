-- =============================================================================
-- GENERATED FILE - do not edit by hand.
-- Concatenation of supabase/migrations/*.sql in order, for setting up a fresh
-- Supabase project in a single paste into the SQL editor.
-- Regenerate with: node supabase/build-setup.mjs
-- Every statement is idempotent, so re-running is safe.
-- =============================================================================

-- >>>>> 0000_base_schema.sql ----------------------------------------

-- ============================================================================
-- Base schema: profiles, portfolios, and the auth glue between them.
--
-- Every other migration in this folder assumes these two tables already exist
-- (0001 adds a column to portfolios, 0002 attaches RLS policies to both), which
-- was true of the original project but not of a fresh one. Run this first.
--
-- Idempotent. Run order: 0000 → 0001 → 0002 → 0003 → 0004 → 0005.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. profiles — one row per auth user, keyed by the same id.
--    RLS in 0002 relies on `auth.uid() = id`, so the shared key is required.
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text,
  display_name text,
  bio          text,
  avatar_url   text,
  website      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- 0001 adds the unique index on username (partial, so NULLs stay allowed).

-- ----------------------------------------------------------------------------
-- 2. portfolios
--    user_id references profiles rather than auth.users: PostgREST derives its
--    embedding from foreign keys, and the app asks for portfolios(profiles(…))
--    and profiles(portfolios(count)) in both directions.
-- ----------------------------------------------------------------------------
create table if not exists public.portfolios (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  title         text not null,
  description   text,
  category      text,
  project_url   text,
  thumbnail_url text,
  views         integer not null default 0,
  likes         integer not null default 0,
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes for the three list queries the app actually runs: a creator's works,
-- the newest-first feed, and the category filter.
create index if not exists portfolios_user_id_idx    on public.portfolios (user_id);
create index if not exists portfolios_created_at_idx on public.portfolios (created_at desc);
create index if not exists portfolios_category_idx   on public.portfolios (category);
create index if not exists portfolios_featured_idx   on public.portfolios (featured) where featured;

-- ----------------------------------------------------------------------------
-- 3. Keep updated_at honest. The app sets portfolios.updated_at explicitly on
--    edit, but sitemap.ts reads profiles.updated_at, which nothing was touching.
-- ----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists portfolios_touch_updated_at on public.portfolios;
create trigger portfolios_touch_updated_at
  before update on public.portfolios
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Give every new auth user a profile row.
--    Without this, the profiles RLS insert policy (auth.uid() = id) is the only
--    path, and an OAuth sign-in that never reaches onboarding would leave the
--    user without a row — the header, dashboard and profile page all read it.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 5. Username -> email lookup, used by username sign-in.
--    auth.users is not reachable from the client, so this runs as definer. It
--    is deliberately NOT granted to anon/authenticated: exposing it would turn
--    the login form into a username-to-email harvester. The app calls it with
--    the service-role client. 0002 re-asserts these grants.
-- ----------------------------------------------------------------------------
create or replace function public.get_email_by_username(p_username text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
    from public.profiles p
    join auth.users u on u.id = p.id
   where p.username = p_username
   limit 1;
$$;

revoke execute on function public.get_email_by_username(text) from public, anon, authenticated;
grant execute on function public.get_email_by_username(text) to service_role;


-- >>>>> 0001_review_fixes.sql ---------------------------------------

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


-- >>>>> 0002_security.sql -------------------------------------------

-- ============================================================================
-- Security hardening: RLS policies, storage policies, restricted email lookup,
-- and view-count abuse prevention.
--
-- Run after 0001_review_fixes.sql. Idempotent — safe to re-run.
-- Review every policy against your actual schema before trusting it in prod.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Row Level Security: portfolios
--    Public read; writes only by the owner. The view counter still works
--    because increment_portfolio_views is SECURITY DEFINER (bypasses RLS).
-- ----------------------------------------------------------------------------
alter table public.portfolios enable row level security;

drop policy if exists "portfolios_select_public" on public.portfolios;
create policy "portfolios_select_public"
  on public.portfolios for select
  using (true);
  -- Tighten to `using (published = true)` if you add a published/visibility flag.

drop policy if exists "portfolios_insert_own" on public.portfolios;
create policy "portfolios_insert_own"
  on public.portfolios for insert
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_update_own" on public.portfolios;
create policy "portfolios_update_own"
  on public.portfolios for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolios_delete_own" on public.portfolios;
create policy "portfolios_delete_own"
  on public.portfolios for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. Row Level Security: profiles
--    Public read; a user may only insert/update their own row (id = auth.uid()).
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_public" on public.profiles;
create policy "profiles_select_public"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 3. Storage: avatars bucket
--    Public read; writes scoped to a top-level folder named after the user id
--    (uploads use `${user.id}/<uuid>.<ext>`).
-- ----------------------------------------------------------------------------
drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 4. Restrict username -> email lookup to the service role only.
--    The app calls this with the service-role client (server-only), so it no
--    longer needs to be callable by anonymous clients — closing an email
--    harvesting vector. Adjust the (text) signature if your function differs.
-- ----------------------------------------------------------------------------
do $$
begin
  execute 'revoke execute on function public.get_email_by_username(text) from anon, public';
  execute 'grant execute on function public.get_email_by_username(text) to service_role';
exception
  when undefined_function then
    raise notice 'get_email_by_username(text) not found — adjust the signature to match your function.';
end $$;

-- ----------------------------------------------------------------------------
-- 5. View-count abuse prevention.
--    Dedup increments per (portfolio, viewer, day). The app passes a hashed
--    viewer fingerprint (ip + user-agent). Only the first view per viewer/day
--    bumps the counter, blunting trivial scripted inflation.
-- ----------------------------------------------------------------------------
create table if not exists public.portfolio_view_events (
  portfolio_id uuid not null,
  viewer text not null,
  viewed_on date not null default current_date,
  primary key (portfolio_id, viewer, viewed_on)
);

-- No policies on this table => only SECURITY DEFINER functions / service_role
-- can touch it.
alter table public.portfolio_view_events enable row level security;

-- Replace the single-arg version from 0001 with the deduping two-arg version.
drop function if exists public.increment_portfolio_views(uuid);

create or replace function public.increment_portfolio_views(p_id uuid, p_viewer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.portfolio_view_events (portfolio_id, viewer)
  values (p_id, left(coalesce(nullif(p_viewer, ''), 'unknown'), 64))
  on conflict do nothing;

  if found then
    update public.portfolios
       set views = coalesce(views, 0) + 1
     where id = p_id;
  end if;
end;
$$;

grant execute on function public.increment_portfolio_views(uuid, text) to anon, authenticated;


-- >>>>> 0003_likes_system.sql ---------------------------------------

-- ============================================================================
-- 0003_likes_system.sql
-- Implement a robust like system with portfolio_likes table and RPC.
-- ============================================================================

-- 1. Create portfolio_likes table
create table if not exists public.portfolio_likes (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (portfolio_id, user_id)
);

-- 2. Enable RLS
alter table public.portfolio_likes enable row level security;

drop policy if exists "portfolio_likes_select_public" on public.portfolio_likes;
create policy "portfolio_likes_select_public"
  on public.portfolio_likes for select
  using (true);

-- We do NOT create INSERT/DELETE policies for users, because we will route
-- all likes through a SECURITY DEFINER RPC to ensure atomicity.

-- 3. Create toggle_like RPC
drop function if exists public.toggle_like(uuid);

create or replace function public.toggle_like(p_portfolio_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_liked boolean;
begin
  -- Require authentication
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock the portfolio row for update to prevent concurrent modification issues
  -- (Atomic update)
  perform 1 from public.portfolios where id = p_portfolio_id for update;

  -- Check if already liked
  if exists (select 1 from public.portfolio_likes where portfolio_id = p_portfolio_id and user_id = v_user_id) then
    -- Unlike
    delete from public.portfolio_likes where portfolio_id = p_portfolio_id and user_id = v_user_id;
    update public.portfolios set likes = greatest(coalesce(likes, 0) - 1, 0) where id = p_portfolio_id;
    v_liked := false;
  else
    -- Like
    insert into public.portfolio_likes (portfolio_id, user_id) values (p_portfolio_id, v_user_id);
    update public.portfolios set likes = coalesce(likes, 0) + 1 where id = p_portfolio_id;
    v_liked := true;
  end if;

  return v_liked;
end;
$$;

-- Grant execute to authenticated users ONLY
revoke execute on function public.toggle_like(uuid) from public, anon;
grant execute on function public.toggle_like(uuid) to authenticated;


-- >>>>> 0004_portfolio_crud.sql -------------------------------------

-- ============================================================================
-- Portfolio CRUD support: cover-image storage bucket, tag tables, and the
-- SECURITY DEFINER RPCs used by the create/edit/delete flow.
--
-- Run after 0002_security.sql. Idempotent. Assumes portfolios(id uuid,
-- user_id uuid) and tags(id, name) / portfolio_tags(portfolio_id, tag_id).
-- The `create table if not exists` blocks only seed a fresh project; existing
-- tables are left untouched, and the RPCs work regardless of the tags id type
-- as long as the column names match.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Cover-image storage bucket (uploads use `${user.id}/<uuid>.<ext>`).
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('portfolios', 'portfolios', true)
on conflict (id) do nothing;

drop policy if exists "portfolios_bucket_select_public" on storage.objects;
create policy "portfolios_bucket_select_public"
  on storage.objects for select
  using (bucket_id = 'portfolios');

drop policy if exists "portfolios_bucket_insert_own" on storage.objects;
create policy "portfolios_bucket_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolios_bucket_update_own" on storage.objects;
create policy "portfolios_bucket_update_own"
  on storage.objects for update
  using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "portfolios_bucket_delete_own" on storage.objects;
create policy "portfolios_bucket_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'portfolios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- 2. Tag tables (only created if absent). The app stores tags lowercased, so a
--    plain UNIQUE(name) is enough and matches the ON CONFLICT below.
-- ----------------------------------------------------------------------------
create table if not exists public.tags (
  id bigint generated always as identity primary key,
  name text not null
);
create unique index if not exists tags_name_key on public.tags (name);

create table if not exists public.portfolio_tags (
  portfolio_id uuid not null references public.portfolios(id) on delete cascade,
  tag_id bigint not null references public.tags(id) on delete cascade,
  primary key (portfolio_id, tag_id)
);

-- Public read; writes go exclusively through the SECURITY DEFINER RPCs below.
alter table public.tags enable row level security;
alter table public.portfolio_tags enable row level security;

drop policy if exists "tags_select_public" on public.tags;
create policy "tags_select_public" on public.tags for select using (true);

drop policy if exists "portfolio_tags_select_public" on public.portfolio_tags;
create policy "portfolio_tags_select_public" on public.portfolio_tags for select using (true);

-- ----------------------------------------------------------------------------
-- 3. Replace a portfolio's tags. Verifies ownership via auth.uid(), then
--    upserts tag names and rebuilds the links. An empty/NULL array clears them.
-- ----------------------------------------------------------------------------
create or replace function public.set_portfolio_tags(p_portfolio_id uuid, p_tags text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  t text;
begin
  if not exists (
    select 1 from portfolios where id = p_portfolio_id and user_id = auth.uid()
  ) then
    raise exception 'Not authorized to modify this portfolio';
  end if;

  delete from portfolio_tags where portfolio_id = p_portfolio_id;

  if p_tags is null then
    return;
  end if;

  foreach t in array p_tags loop
    t := lower(btrim(t));
    if t = '' then
      continue;
    end if;
    insert into tags (name) values (t) on conflict (name) do nothing;
    insert into portfolio_tags (portfolio_id, tag_id)
      select p_portfolio_id, id from tags where name = t
      on conflict do nothing;
  end loop;
end;
$$;

grant execute on function public.set_portfolio_tags(uuid, text[]) to authenticated;

-- ----------------------------------------------------------------------------
-- 4. Delete a portfolio (ownership-checked) including its tag links.
-- ----------------------------------------------------------------------------
create or replace function public.delete_portfolio(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from portfolios where id = p_id and user_id = auth.uid()
  ) then
    raise exception 'Not authorized to delete this portfolio';
  end if;

  delete from portfolio_tags where portfolio_id = p_id;
  delete from portfolios where id = p_id;
end;
$$;

grant execute on function public.delete_portfolio(uuid) to authenticated;


-- >>>>> 0005_media_dimensions.sql -----------------------------------

-- ============================================================================
-- Cover-image dimensions.
--
-- The browsing grids are masonry: each card has to reserve its final height
-- before the image loads, or the whole column reflows on every load and the
-- layout shifts under the reader. Storing the uploaded image's intrinsic size
-- lets the card render an exact aspect-ratio box on the server.
--
-- Nullable on purpose: rows created before this migration have no dimensions,
-- and the card falls back to 4:3 for those. Run after 0004_portfolio_crud.sql.
-- Idempotent.
-- ============================================================================

alter table public.portfolios
  add column if not exists thumbnail_width int,
  add column if not exists thumbnail_height int;

-- Guard against nonsense values (0 would make the aspect ratio divide by zero,
-- and anything beyond 30k px is not a real image).
alter table public.portfolios
  drop constraint if exists portfolios_thumbnail_dimensions_positive;
alter table public.portfolios
  add constraint portfolios_thumbnail_dimensions_positive
  check (
    (thumbnail_width is null or (thumbnail_width > 0 and thumbnail_width <= 30000))
    and (thumbnail_height is null or (thumbnail_height > 0 and thumbnail_height <= 30000))
  );

comment on column public.portfolios.thumbnail_width is
  'Intrinsic width in px of thumbnail_url, measured at upload. Null = unknown (card falls back to 4:3).';
comment on column public.portfolios.thumbnail_height is
  'Intrinsic height in px of thumbnail_url, measured at upload. Null = unknown (card falls back to 4:3).';
