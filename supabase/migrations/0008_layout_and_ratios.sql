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
