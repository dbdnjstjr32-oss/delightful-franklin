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


-- >>>>> 0006_creator_studio.sql -------------------------------------

-- ============================================================================
-- Creator studio: draft/published status and multi-file attachments.
--
-- Two things the upload flow could not express before:
--   1. A work was public the instant it was inserted — there was no way to
--      save a half-written piece. `status` adds that, and the public SELECT
--      policy is tightened so drafts are visible to their owner only.
--   2. A work carried exactly one image (`thumbnail_url`). Creators post
--      series, process shots, clips and downloadable files, so attachments
--      move into their own ordered table.
--
-- Run after 0005_media_dimensions.sql. Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. portfolios.status
--    Existing rows default to 'published' so nothing disappears on migrate.
-- ----------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists status text not null default 'published';

do $$
begin
  alter table public.portfolios
    add constraint portfolios_status_check check (status in ('draft', 'published'));
exception
  when duplicate_object then null;
end $$;

-- The public feeds filter on status and sort by recency; the studio filters on
-- owner + status. One partial index covers the public reads.
create index if not exists portfolios_status_created_at_idx
  on public.portfolios (created_at desc)
  where status = 'published';

create index if not exists portfolios_user_status_idx
  on public.portfolios (user_id, status);

-- ----------------------------------------------------------------------------
-- 2. Drafts are private.
--    Replaces the permissive `using (true)` from 0002_security.sql. The app
--    also filters explicitly on status, but this is the boundary that holds
--    when someone queries the REST API directly with the public anon key.
-- ----------------------------------------------------------------------------
drop policy if exists "portfolios_select_public" on public.portfolios;
create policy "portfolios_select_public"
  on public.portfolios for select
  using (status = 'published' or auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. portfolio_assets — ordered attachments for a work.
--    user_id is denormalised from the parent so the write policies are a plain
--    column comparison instead of a subquery on every row.
-- ----------------------------------------------------------------------------
create table if not exists public.portfolio_assets (
  id           uuid primary key default gen_random_uuid(),
  portfolio_id uuid not null references public.portfolios (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  url          text not null,
  storage_path text,
  kind         text not null default 'image',
  mime_type    text,
  size_bytes   bigint,
  width        integer,
  height       integer,
  caption      text,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);

do $$
begin
  alter table public.portfolio_assets
    add constraint portfolio_assets_kind_check
    check (kind in ('image', 'video', 'audio', 'file'));
exception
  when duplicate_object then null;
end $$;

-- Same range check as 0005 uses for cover dimensions.
do $$
begin
  alter table public.portfolio_assets
    add constraint portfolio_assets_dimensions_check
    check (
      (width is null or (width > 0 and width <= 30000)) and
      (height is null or (height > 0 and height <= 30000))
    );
exception
  when duplicate_object then null;
end $$;

create index if not exists portfolio_assets_portfolio_idx
  on public.portfolio_assets (portfolio_id, position);

alter table public.portfolio_assets enable row level security;

-- Readable exactly when the parent work is readable, so a draft's attachments
-- stay with the draft.
drop policy if exists "portfolio_assets_select" on public.portfolio_assets;
create policy "portfolio_assets_select"
  on public.portfolio_assets for select
  using (
    exists (
      select 1 from public.portfolios p
       where p.id = portfolio_id
         and (p.status = 'published' or p.user_id = auth.uid())
    )
  );

drop policy if exists "portfolio_assets_insert_own" on public.portfolio_assets;
create policy "portfolio_assets_insert_own"
  on public.portfolio_assets for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.portfolios p
       where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );

drop policy if exists "portfolio_assets_update_own" on public.portfolio_assets;
create policy "portfolio_assets_update_own"
  on public.portfolio_assets for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "portfolio_assets_delete_own" on public.portfolio_assets;
create policy "portfolio_assets_delete_own"
  on public.portfolio_assets for delete
  using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. Replace a work's attachments in one ownership-checked call.
--    Mirrors set_portfolio_tags: the client sends the full desired list and the
--    function rebuilds it, so ordering and removals need no diffing client-side.
--    An empty array clears them.
--
--    p_assets is a JSON array of objects:
--      { url, storage_path, kind, mime_type, size_bytes, width, height, caption }
--    Position comes from array order, not from the payload.
-- ----------------------------------------------------------------------------
create or replace function public.set_portfolio_assets(p_portfolio_id uuid, p_assets jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from portfolios where id = p_portfolio_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Not authorized to modify this portfolio';
  end if;

  delete from portfolio_assets where portfolio_id = p_portfolio_id;

  if p_assets is null or jsonb_typeof(p_assets) <> 'array' then
    return;
  end if;

  insert into portfolio_assets (
    portfolio_id, user_id, url, storage_path, kind,
    mime_type, size_bytes, width, height, caption, position
  )
  select
    p_portfolio_id,
    v_owner,
    a.value ->> 'url',
    nullif(a.value ->> 'storage_path', ''),
    coalesce(nullif(a.value ->> 'kind', ''), 'image'),
    nullif(a.value ->> 'mime_type', ''),
    nullif(a.value ->> 'size_bytes', '')::bigint,
    nullif(a.value ->> 'width', '')::integer,
    nullif(a.value ->> 'height', '')::integer,
    nullif(left(coalesce(a.value ->> 'caption', ''), 200), ''),
    a.ordinality - 1
  from jsonb_array_elements(p_assets) with ordinality as a(value, ordinality)
  where coalesce(a.value ->> 'url', '') <> ''
    and coalesce(nullif(a.value ->> 'kind', ''), 'image') in ('image', 'video', 'audio', 'file')
  limit 40;
end;
$$;

grant execute on function public.set_portfolio_assets(uuid, jsonb) to authenticated;

-- ----------------------------------------------------------------------------
-- 5. Public profile stats count published work only.
--    get_profile_stats is SECURITY DEFINER, so it sees past RLS — without this
--    filter the counters on a public profile would include the creator's
--    drafts, telling visitors how much unpublished work exists.
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
  where user_id = p_user_id
    and status = 'published';
$$;

grant execute on function public.get_profile_stats(uuid) to anon, authenticated;


-- >>>>> 0007_upload_hardening.sql -----------------------------------

-- ============================================================================
-- Upload hardening, following the security probe of the creator-studio work.
--
-- Moving uploads from the server action into the browser (0006 + upload-client)
-- removed the only place a cover was checked before it reached storage. The
-- storage policies still scope writes to `${auth.uid()}/…`, so nobody can touch
-- anyone else's folder — but within their own folder an authenticated user
-- could store any type at any size, which turns a public bucket into a general
-- file host. Both buckets now declare what they accept, which is enforced by
-- Storage itself and therefore cannot be skipped by a crafted request.
--
-- Run after 0006_creator_studio.sql. Idempotent — safe to re-run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. portfolios bucket: the attachment allowlist from src/lib/uploads.ts.
--    Keep the two in sync — the client uses it to reject a file before the
--    upload, this is what actually enforces it.
--
--    image/svg+xml is deliberately absent. An SVG is a script container, and
--    objects here are served from the Supabase origin under a public URL.
-- ----------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array[
         'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif',
         'video/mp4', 'video/webm', 'video/quicktime',
         'audio/mpeg', 'audio/wav', 'audio/ogg',
         'application/pdf', 'application/zip'
       ],
       file_size_limit = 52428800  -- 50MB, matches MAX_ASSET_BYTES
 where id = 'portfolios';

-- ----------------------------------------------------------------------------
-- 2. avatars bucket. Uploads here still go through a server action that does
--    magic-number validation, so this is defense in depth rather than a fix.
-- ----------------------------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'],
       file_size_limit = 5242880  -- 5MB, matches MAX_AVATAR_BYTES
 where id = 'avatars';

-- ----------------------------------------------------------------------------
-- 3. The view counter must ignore drafts.
--    increment_portfolio_views is SECURITY DEFINER, so it bypasses the RLS that
--    hides drafts — an anonymous caller could bump (and, by watching whether the
--    count moved, probe for) the id of an unpublished work.
-- ----------------------------------------------------------------------------
create or replace function public.increment_portfolio_views(p_id uuid, p_viewer text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.portfolios where id = p_id and status = 'published'
  ) then
    return;
  end if;

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

-- ----------------------------------------------------------------------------
-- 4. set_portfolio_assets: make the row cap deterministic.
--    The previous LIMIT had no ORDER BY, so which 40 rows survived an oversized
--    payload was left to the planner. Order by the array position instead.
-- ----------------------------------------------------------------------------
create or replace function public.set_portfolio_assets(p_portfolio_id uuid, p_assets jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from portfolios where id = p_portfolio_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Not authorized to modify this portfolio';
  end if;

  delete from portfolio_assets where portfolio_id = p_portfolio_id;

  if p_assets is null or jsonb_typeof(p_assets) <> 'array' then
    return;
  end if;

  insert into portfolio_assets (
    portfolio_id, user_id, url, storage_path, kind,
    mime_type, size_bytes, width, height, caption, position
  )
  select
    p_portfolio_id,
    v_owner,
    a.value ->> 'url',
    nullif(a.value ->> 'storage_path', ''),
    coalesce(nullif(a.value ->> 'kind', ''), 'image'),
    nullif(a.value ->> 'mime_type', ''),
    nullif(a.value ->> 'size_bytes', '')::bigint,
    nullif(a.value ->> 'width', '')::integer,
    nullif(a.value ->> 'height', '')::integer,
    nullif(left(coalesce(a.value ->> 'caption', ''), 200), ''),
    row_number() over (order by a.ordinality) - 1
  from jsonb_array_elements(p_assets) with ordinality as a(value, ordinality)
  where coalesce(a.value ->> 'url', '') <> ''
    and coalesce(nullif(a.value ->> 'kind', ''), 'image') in ('image', 'video', 'audio', 'file')
  order by a.ordinality
  limit 40;
end;
$$;

grant execute on function public.set_portfolio_assets(uuid, jsonb) to authenticated;


-- >>>>> 0008_layout_and_ratios.sql ----------------------------------

-- ============================================================================
-- Work-page layout presets and creator-chosen display ratios.
--
-- Two things creators could not control:
--
--   1. Every work rendered the same way. A deck of presentation slides, a
--      set of demo screenshots and a written case study all want different
--      pages, so `layout` lets the creator pick one.
--   2. Media rendered at whatever intrinsic size it happened to have. A ratio
--      column lets the creator say how a piece should be *presented* —
--      screenshots normalised to 16:9, say — without touching the file. The
--      stored `thumbnail_width`/`height` from 0005 stay as they are; they
--      describe the file, this describes the frame.
--
-- Null ratio means "use the file's own proportions", which is the behaviour
-- everything had before this migration.
--
-- Run after 0007_upload_hardening.sql. Idempotent.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Layout preset.
-- ----------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists layout text not null default 'gallery';

do $$
begin
  alter table public.portfolios
    add constraint portfolios_layout_check
    check (layout in ('gallery', 'deck', 'case_study'));
exception
  when duplicate_object then null;
end $$;

comment on column public.portfolios.layout is
  'How the work page renders its attachments: gallery (stacked), deck (numbered slides), case_study (alternating text and media).';

-- ----------------------------------------------------------------------------
-- 2. Display ratios.
--    Stored as the literal token the UI offers, not a computed number, so the
--    creator's choice survives round-tripping through the edit form.
-- ----------------------------------------------------------------------------
alter table public.portfolios
  add column if not exists thumbnail_ratio text;

alter table public.portfolio_assets
  add column if not exists ratio text;

do $$
begin
  alter table public.portfolios
    add constraint portfolios_thumbnail_ratio_check
    check (thumbnail_ratio is null or thumbnail_ratio in ('16:9', '4:3', '1:1', '3:4', '9:16'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.portfolio_assets
    add constraint portfolio_assets_ratio_check
    check (ratio is null or ratio in ('16:9', '4:3', '1:1', '3:4', '9:16'));
exception
  when duplicate_object then null;
end $$;

comment on column public.portfolios.thumbnail_ratio is
  'Creator-chosen aspect ratio for the cover in card grids. Null = use the intrinsic size from thumbnail_width/height.';
comment on column public.portfolio_assets.ratio is
  'Creator-chosen aspect ratio for this attachment on the work page. Null = use the file''s own proportions.';

-- ----------------------------------------------------------------------------
-- 3. set_portfolio_assets carries `ratio` through.
--    Same ownership check and array-position ordering as 0007; the only change
--    is the extra column.
-- ----------------------------------------------------------------------------
create or replace function public.set_portfolio_assets(p_portfolio_id uuid, p_assets jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select user_id into v_owner from portfolios where id = p_portfolio_id;

  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'Not authorized to modify this portfolio';
  end if;

  delete from portfolio_assets where portfolio_id = p_portfolio_id;

  if p_assets is null or jsonb_typeof(p_assets) <> 'array' then
    return;
  end if;

  insert into portfolio_assets (
    portfolio_id, user_id, url, storage_path, kind,
    mime_type, size_bytes, width, height, caption, ratio, position
  )
  select
    p_portfolio_id,
    v_owner,
    a.value ->> 'url',
    nullif(a.value ->> 'storage_path', ''),
    coalesce(nullif(a.value ->> 'kind', ''), 'image'),
    nullif(a.value ->> 'mime_type', ''),
    nullif(a.value ->> 'size_bytes', '')::bigint,
    nullif(a.value ->> 'width', '')::integer,
    nullif(a.value ->> 'height', '')::integer,
    nullif(left(coalesce(a.value ->> 'caption', ''), 200), ''),
    case
      when a.value ->> 'ratio' in ('16:9', '4:3', '1:1', '3:4', '9:16')
      then a.value ->> 'ratio'
    end,
    row_number() over (order by a.ordinality) - 1
  from jsonb_array_elements(p_assets) with ordinality as a(value, ordinality)
  where coalesce(a.value ->> 'url', '') <> ''
    and coalesce(nullif(a.value ->> 'kind', ''), 'image') in ('image', 'video', 'audio', 'file')
  order by a.ordinality
  limit 40;
end;
$$;

grant execute on function public.set_portfolio_assets(uuid, jsonb) to authenticated;
