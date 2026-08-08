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
