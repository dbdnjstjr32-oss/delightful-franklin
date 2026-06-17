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
