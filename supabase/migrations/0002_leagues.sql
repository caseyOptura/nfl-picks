-- ============================================================
-- Migration 0002: leagues, league_members, picks, invitations
-- ============================================================

-- 1. Add email column to profiles + update trigger
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, nickname, email)
  values (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'nickname',
    new.email
  );
  return new;
end;
$$;

-- 2. Create tables first (helper functions reference them, so tables must exist first)

create table public.leagues (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  season_year  int  not null,
  photo_url    text,
  created_by   uuid not null references auth.users(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create table public.league_members (
  id         uuid primary key default gen_random_uuid(),
  league_id  uuid not null references public.leagues(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','member')),
  joined_at  timestamptz not null default now(),
  unique (league_id, user_id)
);

create index idx_league_members_league_id on public.league_members(league_id);
create index idx_league_members_user_id on public.league_members(user_id);

create table public.picks (
  id               uuid primary key default gen_random_uuid(),
  league_id        uuid not null references public.leagues(id) on delete cascade,
  user_id          uuid not null references auth.users(id) on delete cascade,
  game_id          text not null,
  picked_team_id   text not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (league_id, user_id, game_id)
);

create index idx_picks_league_id on public.picks(league_id);
create index idx_picks_user_id on public.picks(user_id);

create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  league_id    uuid not null references public.leagues(id) on delete cascade,
  email        text not null,
  token        uuid not null default gen_random_uuid() unique,
  invited_by   uuid not null references auth.users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending','accepted','revoked')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz
);

create index idx_invitations_league_id on public.invitations(league_id);
create index idx_invitations_token on public.invitations(token);

-- 3. Security-definer helper functions (tables exist now — no forward-reference error)
--    These prevent RLS infinite recursion on league_members policies.

create or replace function public.is_league_member(p_league_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.league_members
    where league_id = p_league_id and user_id = p_user_id
  );
$$;

create or replace function public.is_league_owner(p_league_id uuid, p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.leagues
    where id = p_league_id and created_by = p_user_id
  );
$$;

-- 4. RLS policies

alter table public.leagues enable row level security;

create policy "League members can view league"
  on public.leagues for select
  using (public.is_league_member(id, auth.uid()));

create policy "Authenticated users can create leagues"
  on public.leagues for insert
  with check (auth.uid() = created_by);

create policy "League owner can update league"
  on public.leagues for update
  using (public.is_league_owner(id, auth.uid()));

create policy "League owner can delete league"
  on public.leagues for delete
  using (public.is_league_owner(id, auth.uid()));

alter table public.league_members enable row level security;

create policy "League members can view membership"
  on public.league_members for select
  using (public.is_league_member(league_id, auth.uid()));

create policy "League owner can insert members"
  on public.league_members for insert
  with check (public.is_league_owner(league_id, auth.uid()) or user_id = auth.uid());

create policy "League owner can delete members"
  on public.league_members for delete
  using (public.is_league_owner(league_id, auth.uid()) and user_id != auth.uid());

alter table public.picks enable row level security;

create policy "League members can view picks"
  on public.picks for select
  using (public.is_league_member(league_id, auth.uid()));

create policy "User can insert own picks"
  on public.picks for insert
  with check (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));

create policy "User can update own picks"
  on public.picks for update
  using (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));

alter table public.invitations enable row level security;

create policy "League members can view invitations"
  on public.invitations for select
  using (public.is_league_member(league_id, auth.uid()));

create policy "League members can create invitations"
  on public.invitations for insert
  with check (public.is_league_member(league_id, auth.uid()) and invited_by = auth.uid());

create policy "Inviter can update invitation"
  on public.invitations for update
  using (invited_by = auth.uid() or public.is_league_owner(league_id, auth.uid()));

-- 5. profiles SELECT policy for co-members (needed for leaderboard display)
create policy "League co-members are viewable"
  on public.profiles for select
  using (
    exists (
      select 1 from public.league_members lm_self
      join public.league_members lm_other
        on lm_self.league_id = lm_other.league_id
      where lm_self.user_id = auth.uid()
        and lm_other.user_id = profiles.id
    )
  );

-- 6. Trigger: auto-insert owner row in league_members when a league is created
create or replace function public.handle_new_league()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.league_members (league_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_league_created
  after insert on public.leagues
  for each row execute function public.handle_new_league();
