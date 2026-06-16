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
