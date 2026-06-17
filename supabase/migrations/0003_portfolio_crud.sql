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
