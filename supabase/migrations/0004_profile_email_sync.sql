-- ============================================================
-- Migration 0004: keep profiles.email in sync with auth.users.email
--
-- profiles.email was written once, by handle_new_user() at signup, and never
-- again. server/api/invitations/index.post.ts uses it to decide whether an
-- invited address already belongs to a member, so any drift made that check
-- miss and re-invite someone who already had an account — one of the ways a
-- single person ended up with two profiles.
-- ============================================================

-- 1. Normalize the address on signup. GoTrue is the only writer of
--    auth.users.email, but storing a lowercased copy makes every lookup in the
--    app case-insensitive without needing lower() at each call site.
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
    lower(new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 2. Resync whenever the auth email changes (email change flow, admin edit).
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles
       set email = lower(new.email),
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- 3. Backfill: lowercase existing addresses and repair any that already drifted.
update public.profiles p
   set email = lower(u.email),
       updated_at = now()
  from auth.users u
 where p.id = u.id
   and p.email is distinct from lower(u.email);

-- 4. Heal profile rows that are missing entirely. An auth user with no profile
--    authenticates fine and then hits "Profile not found. Please contact
--    support." on /profile, with no way to recover from inside the app.
insert into public.profiles (id, first_name, last_name, nickname, email)
select
  u.id,
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'nickname',
  lower(u.email)
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- 5. Report — but do not fail on — any remaining duplicate addresses, so this
--    migration surfaces the problem without blocking a deploy.
do $$
declare
  dupes text;
begin
  select string_agg(email, ', ')
    into dupes
    from (
      select email
        from public.profiles
       where email is not null
       group by email
      having count(*) > 1
    ) d;

  if dupes is not null then
    raise warning 'Duplicate profiles.email values still present: %', dupes;
  end if;
end $$;
