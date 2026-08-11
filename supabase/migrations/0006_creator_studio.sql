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
