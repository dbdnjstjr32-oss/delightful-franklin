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
