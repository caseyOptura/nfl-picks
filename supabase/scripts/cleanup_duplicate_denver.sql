-- ============================================================
-- One-off cleanup: remove the empty duplicate account created by the
-- invite email-mismatch bug (see PR #14).
--
-- Context, verified against the database on 2026-09-21:
--
--   KEEP   7b806d28-4162-448d-8f93-f678651924f8  denverjosephjohnson@yahoo.com
--          profile "Le champion", member of "Sunday Crew", has picks,
--          signed in and in active use.
--
--   DELETE dbf8068d-e462-4c84-b77c-acb976d21839  denverjosephjohnson@gmail.com
--          no profile row, no memberships, no picks. Created 77 seconds
--          before the yahoo account because the invite went to yahoo and
--          the mismatch error gave him no way forward. While it exists he
--          can keep landing on it and hitting "Profile not found".
--
-- RUN THE STEPS IN ORDER. Step 3 must run after step 2, or migration 0004
-- will backfill a profile row for the account you are about to delete.
-- ============================================================


-- ------------------------------------------------------------
-- STEP 1 — Confirm the state before changing anything. READ ONLY.
-- Expect: yahoo row has has_profile=1, memberships=1, picks>=1.
--         gmail row has all three at 0.
-- If the gmail row shows anything other than 0/0/0, STOP — it has data
-- and must be merged rather than deleted.
-- ------------------------------------------------------------
select
  u.id,
  u.email,
  u.last_sign_in_at,
  (select count(*) from public.profiles p       where p.id = u.id)      as has_profile,
  (select count(*) from public.league_members m where m.user_id = u.id) as memberships,
  (select count(*) from public.picks pk         where pk.user_id = u.id) as picks,
  (select count(*) from public.leagues l        where l.created_by = u.id) as leagues_created,
  (select count(*) from public.invitations i    where i.invited_by = u.id) as invites_sent
from auth.users u
where u.id in (
  '7b806d28-4162-448d-8f93-f678651924f8',
  'dbf8068d-e462-4c84-b77c-acb976d21839'
)
order by u.email;


-- ------------------------------------------------------------
-- STEP 2 — Delete the empty duplicate.
--
-- DESTRUCTIVE AND IRREVERSIBLE. auth.users cascades to profiles,
-- league_members, picks, leagues.created_by and invitations.invited_by,
-- which is why step 1 must show 0/0/0 first.
--
-- The guard clause makes this a no-op unless the account is genuinely
-- empty, so it is safe to run even if someone has touched it since.
-- ------------------------------------------------------------
delete from auth.users u
where u.id = 'dbf8068d-e462-4c84-b77c-acb976d21839'
  and not exists (select 1 from public.profiles       p where p.id = u.id)
  and not exists (select 1 from public.league_members m where m.user_id = u.id)
  and not exists (select 1 from public.picks          k where k.user_id = u.id)
  and not exists (select 1 from public.leagues        l where l.created_by = u.id)
  and not exists (select 1 from public.invitations    i where i.invited_by = u.id);

-- Expect "DELETE 1". If it reports "DELETE 0", the guard blocked it —
-- re-run step 1 to see what data appeared, and do not force it.


-- ------------------------------------------------------------
-- STEP 3 — Apply migration 0004.
--
-- Run supabase/migrations/0004_profile_email_sync.sql, either through
-- your migration tooling or by pasting it into the SQL editor. It is
-- idempotent and safe to re-run.
--
-- It must run AFTER step 2 for the reason in the header.
-- ------------------------------------------------------------


-- ------------------------------------------------------------
-- STEP 4 — Verify. READ ONLY. Every one of these should return zero rows.
-- ------------------------------------------------------------

-- 4a. No auth user left without a profile (this is the state that produces
--     "Profile not found. Please contact support.")
select 'orphan auth user' as problem, u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 4b. No profiles.email out of step with auth.users.email
select 'email drift' as problem, p.id, p.email, u.email as auth_email
from public.profiles p
join auth.users u on u.id = p.id
where p.email is distinct from lower(u.email);

-- 4c. No two accounts sharing a mailbox local-part (the gmail/yahoo split)
select 'duplicate local-part' as problem,
       string_agg(p.email, ' | ') as addresses,
       count(*) as n
from public.profiles p
where p.email is not null
group by lower(split_part(p.email, '@', 1))
having count(*) > 1;

-- 4d. Confirm Denver is intact and still in his league
select p.id, p.email, p.nickname, l.name as league, lm.role
from public.profiles p
join public.league_members lm on lm.user_id = p.id
join public.leagues l on l.id = lm.league_id
where p.id = '7b806d28-4162-448d-8f93-f678651924f8';


-- ------------------------------------------------------------
-- OPTIONAL — not part of this incident.
--
-- Two profiles share the name "Casey Beauchamp":
--   1e72c076-1120-4304-8230-63775c8c71be  casey@optura.ai
--   d04fcb90-d81b-4703-a8ac-789ac49f5f4d  cdbeauchamp7@gmail.com
--
-- The second owns "Sunday Crew" and sent Denver's invitation, so it is
-- load-bearing — do not delete it. If these are meant to be one person,
-- merging them means moving leagues.created_by, league_members, picks and
-- invitations.invited_by onto the keeper first. Left alone deliberately.
-- ------------------------------------------------------------

-- Audit query, if you want to see the footprint of both:
-- select 'leagues'     as tbl, l.created_by::text as owner, count(*) from public.leagues l        where l.created_by in ('1e72c076-1120-4304-8230-63775c8c71be','d04fcb90-d81b-4703-a8ac-789ac49f5f4d') group by 2
-- union all
-- select 'memberships', m.user_id::text,   count(*) from public.league_members m where m.user_id   in ('1e72c076-1120-4304-8230-63775c8c71be','d04fcb90-d81b-4703-a8ac-789ac49f5f4d') group by 2
-- union all
-- select 'picks',       k.user_id::text,   count(*) from public.picks k          where k.user_id   in ('1e72c076-1120-4304-8230-63775c8c71be','d04fcb90-d81b-4703-a8ac-789ac49f5f4d') group by 2
-- union all
-- select 'invites',     i.invited_by::text, count(*) from public.invitations i    where i.invited_by in ('1e72c076-1120-4304-8230-63775c8c71be','d04fcb90-d81b-4703-a8ac-789ac49f5f4d') group by 2;
