-- ============================================================
-- Migration 0005: league chat
--
-- Tables, RLS, realtime authorization, and broadcast triggers for per-league
-- chat. Schema for later PRs (reactions, mentions, push, prefs, quiet hours,
-- Picks Bot) lands here too so the SQL editor only has to be visited once.
-- See docs/chat-implementation-plan.md.
--
-- Realtime model: DB triggers call realtime.send() on private topics
--   league:{id}       persisted events (messages, reactions, membership)
--   league:{id}:room  typing broadcasts + presence (client-sent)
--   user:{id}         events addressed to one user (reactions to their messages)
-- ============================================================

-- 1. Helpers ---------------------------------------------------

-- Same rule as server/api/leagues/[id].get.ts: nickname, else full name, else 'Member'.
create or replace function public.profile_display_name(p_user_id uuid)
returns text
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select coalesce(
              nullif(btrim(p.nickname), ''),
              nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''))
       from public.profiles p
      where p.id = p_user_id),
    'Member'
  );
$$;

-- Extracts the league id from 'league:{uuid}' or 'league:{uuid}:room', else null.
-- Keeps realtime policies from throwing on malformed topics.
create or replace function public.chat_topic_league_id(p_topic text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when p_topic ~ '^league:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:room)?$'
      then substring(p_topic from 8 for 36)::uuid
  end;
$$;

-- 2. Leagues: Picks Bot toggle ---------------------------------

alter table public.leagues add column if not exists chat_bot_enabled boolean not null default true;

-- 3. Messages --------------------------------------------------

create table public.chat_messages (
  id           bigint generated always as identity primary key,
  league_id    uuid not null references public.leagues(id) on delete cascade,
  kind         text not null default 'user' check (kind in ('user','system')),
  user_id      uuid references auth.users(id) on delete cascade,
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  client_id    uuid not null default gen_random_uuid(),
  system_key   text,
  reply_to_id  bigint references public.chat_messages(id) on delete set null,
  created_at   timestamptz not null default now(),
  edited_at    timestamptz,
  deleted_at   timestamptz,
  deleted_by   uuid references auth.users(id) on delete set null,
  check ((kind = 'user') = (user_id is not null)),
  unique (user_id, client_id),
  unique (league_id, system_key)
);

create index idx_chat_messages_league_id_id on public.chat_messages (league_id, id desc);
create index idx_chat_messages_user_id_created_at on public.chat_messages (user_id, created_at desc);

alter table public.chat_messages enable row level security;

create policy "League members can read chat"
  on public.chat_messages for select
  using (public.is_league_member(league_id, auth.uid()));

-- System messages are only inserted by security-definer code.
create policy "League members can post as themselves"
  on public.chat_messages for insert
  with check (
    kind = 'user'
    and system_key is null
    and deleted_at is null
    and user_id = auth.uid()
    and public.is_league_member(league_id, auth.uid())
  );

-- No UPDATE/DELETE policies: edit_chat_message / delete_chat_message below.

-- Flood guard: at most 8 messages per user per 10 seconds.
create or replace function public.chat_rate_limit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.kind = 'user' and (
    select count(*) from public.chat_messages
     where user_id = new.user_id
       and created_at > now() - interval '10 seconds'
  ) >= 8 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  -- Replies must stay inside the league.
  if new.reply_to_id is not null and not exists (
    select 1 from public.chat_messages
     where id = new.reply_to_id and league_id = new.league_id
  ) then
    raise exception 'INVALID_REPLY' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger chat_messages_before_insert
  before insert on public.chat_messages
  for each row execute function public.chat_rate_limit();

-- 4. Mentions --------------------------------------------------
-- Stored inline as @[Display Name](user-uuid); filled by the insert trigger.

create table public.chat_mentions (
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  primary key (message_id, user_id)
);

create index idx_chat_mentions_user_id on public.chat_mentions (user_id);

alter table public.chat_mentions enable row level security;

create policy "League members can read mentions"
  on public.chat_mentions for select
  using (exists (
    select 1 from public.chat_messages m
     where m.id = message_id and public.is_league_member(m.league_id, auth.uid())
  ));

-- 5. Reactions -------------------------------------------------

create table public.chat_reactions (
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  league_id   uuid   not null references public.leagues(id) on delete cascade,
  emoji       text   not null check (emoji in ('👍','👎','😂','🔥','😮','😢','💯','🏈')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index idx_chat_reactions_league_id on public.chat_reactions (league_id);

alter table public.chat_reactions enable row level security;

create policy "League members can read reactions"
  on public.chat_reactions for select
  using (public.is_league_member(league_id, auth.uid()));

create policy "League members can react as themselves"
  on public.chat_reactions for insert
  with check (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));

create policy "Users can remove own reactions"
  on public.chat_reactions for delete
  using (user_id = auth.uid());

-- league_id always comes from the parent message; runs before the RLS check.
create or replace function public.chat_reactions_set_league()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  select league_id into new.league_id
    from public.chat_messages
   where id = new.message_id and deleted_at is null;
  if new.league_id is null then
    raise exception 'MESSAGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger chat_reactions_before_insert
  before insert on public.chat_reactions
  for each row execute function public.chat_reactions_set_league();

-- 6. Read state + presence heartbeat ---------------------------

create table public.chat_read_state (
  league_id             uuid not null references public.leagues(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  last_read_message_id  bigint not null default 0,
  last_seen_at          timestamptz,
  primary key (league_id, user_id)
);

alter table public.chat_read_state enable row level security;

create policy "Users manage own read state"
  on public.chat_read_state for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));

-- 7. Notification preferences ----------------------------------

create table public.chat_notification_prefs (
  league_id       uuid not null references public.leagues(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  muted           boolean not null default false,
  push_messages   boolean not null default true,
  push_reactions  boolean not null default true,
  primary key (league_id, user_id)
);

alter table public.chat_notification_prefs enable row level security;

create policy "Users manage own chat prefs"
  on public.chat_notification_prefs for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));

create table public.user_notification_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  quiet_start  time,
  quiet_end    time,
  timezone     text not null default 'America/New_York'
);

alter table public.user_notification_settings enable row level security;

create policy "Users manage own notification settings"
  on public.user_notification_settings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 8. Push subscriptions ----------------------------------------

create table public.push_subscriptions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  endpoint      text not null unique,
  p256dh        text not null,
  auth          text not null,
  user_agent    text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);

create index idx_push_subscriptions_user_id on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 9. Broadcast triggers ----------------------------------------

-- After insert: record mentions, then broadcast. One function so ordering
-- never depends on trigger names.
create or replace function public.chat_messages_after_insert()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_league_name text;
  v_mentioned   uuid[] := '{}';
  v_reply_user  uuid;
  v_reply_body  text;
begin
  select name into v_league_name from public.leagues where id = new.league_id;

  if new.kind = 'user' then
    -- Explicit @[Name](uuid) tokens, restricted to current members.
    select coalesce(array_agg(distinct lm.user_id), '{}') into v_mentioned
      from regexp_matches(new.body, '@\[[^\]]{1,80}\]\(([0-9a-f-]{36})\)', 'g') as m(g)
      join public.league_members lm
        on lm.league_id = new.league_id and lm.user_id::text = m.g[1];

    -- @league mentions everyone, but only when the owner writes it.
    if new.body ~* '(^|\s)@league(\M|$)' and public.is_league_owner(new.league_id, new.user_id) then
      select array_agg(user_id) into v_mentioned
        from public.league_members where league_id = new.league_id;
    end if;

    -- Replying to someone counts as mentioning them.
    if new.reply_to_id is not null then
      select user_id, left(body, 80) into v_reply_user, v_reply_body
        from public.chat_messages where id = new.reply_to_id and deleted_at is null;
      if v_reply_user is not null and not v_reply_user = any(v_mentioned) then
        v_mentioned := v_mentioned || v_reply_user;
      end if;
    end if;

    v_mentioned := array_remove(v_mentioned, new.user_id);

    insert into public.chat_mentions (message_id, user_id)
    select new.id, unnest(v_mentioned)
    on conflict do nothing;
  end if;

  perform realtime.send(
    jsonb_build_object(
      'id', new.id,
      'leagueId', new.league_id,
      'leagueName', v_league_name,
      'kind', new.kind,
      'userId', new.user_id,
      'senderName', case when new.kind = 'system' then 'Picks Bot' else public.profile_display_name(new.user_id) end,
      'senderAvatarUrl', (select avatar_url from public.profiles where id = new.user_id),
      'body', new.body,
      'clientId', new.client_id,
      'replyToId', new.reply_to_id,
      'replyToSnippet', v_reply_body,
      'mentionedUserIds', to_jsonb(v_mentioned),
      'createdAt', new.created_at
    ),
    'message_created',
    'league:' || new.league_id,
    true
  );
  return null;
end;
$$;

create trigger chat_messages_after_insert
  after insert on public.chat_messages
  for each row execute function public.chat_messages_after_insert();

create or replace function public.chat_messages_after_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    perform realtime.send(
      jsonb_build_object('id', new.id, 'leagueId', new.league_id, 'deletedBy', new.deleted_by, 'deletedAt', new.deleted_at),
      'message_deleted', 'league:' || new.league_id, true);
  elsif new.body is distinct from old.body then
    perform realtime.send(
      jsonb_build_object('id', new.id, 'leagueId', new.league_id, 'body', new.body, 'editedAt', new.edited_at),
      'message_updated', 'league:' || new.league_id, true);
  end if;
  return null;
end;
$$;

create trigger chat_messages_after_update
  after update on public.chat_messages
  for each row execute function public.chat_messages_after_update();

create or replace function public.chat_reactions_after_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  r        public.chat_reactions;
  v_author uuid;
  v_body   text;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;

  perform realtime.send(
    jsonb_build_object(
      'messageId', r.message_id, 'leagueId', r.league_id, 'userId', r.user_id,
      'emoji', r.emoji, 'op', case when tg_op = 'INSERT' then 'added' else 'removed' end
    ),
    'reaction_changed', 'league:' || r.league_id, true);

  if tg_op = 'INSERT' then
    select user_id, left(body, 80) into v_author, v_body
      from public.chat_messages where id = r.message_id;
    if v_author is not null and v_author <> r.user_id then
      perform realtime.send(
        jsonb_build_object(
          'messageId', r.message_id,
          'leagueId', r.league_id,
          'leagueName', (select name from public.leagues where id = r.league_id),
          'reactorId', r.user_id,
          'reactorName', public.profile_display_name(r.user_id),
          'reactorAvatarUrl', (select avatar_url from public.profiles where id = r.user_id),
          'emoji', r.emoji,
          'snippet', v_body
        ),
        'reaction_received', 'user:' || v_author, true);
    end if;
  end if;
  return null;
end;
$$;

create trigger chat_reactions_after_change
  after insert or delete on public.chat_reactions
  for each row execute function public.chat_reactions_after_change();

-- Membership changes: tell clients to drop the channel, and have Picks Bot
-- announce new members.
create or replace function public.chat_league_members_after_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform realtime.send(
      jsonb_build_object('leagueId', old.league_id, 'userId', old.user_id),
      'member_removed', 'league:' || old.league_id, true);
    perform realtime.send(
      jsonb_build_object('leagueId', old.league_id, 'userId', old.user_id),
      'member_removed', 'user:' || old.user_id, true);
    return null;
  end if;

  -- The owner row is created alongside the league; nothing to announce.
  if new.role <> 'owner'
     and (select chat_bot_enabled from public.leagues where id = new.league_id) then
    insert into public.chat_messages (league_id, kind, body, system_key)
    values (new.league_id, 'system',
            '👋 ' || public.profile_display_name(new.user_id) || ' joined the league',
            'joined:' || new.user_id)
    on conflict (league_id, system_key) do nothing;
  end if;
  return null;
end;
$$;

create trigger chat_league_members_after_change
  after insert or delete on public.league_members
  for each row execute function public.chat_league_members_after_change();

-- 10. Edit / delete RPCs ---------------------------------------

create or replace function public.edit_chat_message(p_id bigint, p_body text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.chat_messages
     set body = p_body, edited_at = now()
   where id = p_id
     and user_id = auth.uid()
     and kind = 'user'
     and deleted_at is null
     and created_at > now() - interval '15 minutes'
     and public.is_league_member(league_id, auth.uid());
  if not found then
    raise exception 'EDIT_NOT_ALLOWED' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.delete_chat_message(p_id bigint)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.chat_messages
     set deleted_at = now(), deleted_by = auth.uid()
   where id = p_id
     and deleted_at is null
     and (
       (user_id = auth.uid() and public.is_league_member(league_id, auth.uid()))
       or public.is_league_owner(league_id, auth.uid())
     );
  if not found then
    raise exception 'DELETE_NOT_ALLOWED' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.edit_chat_message(bigint, text) from public, anon;
revoke execute on function public.delete_chat_message(bigint) from public, anon;
grant execute on function public.edit_chat_message(bigint, text) to authenticated;
grant execute on function public.delete_chat_message(bigint) to authenticated;

-- 11. Unread counts --------------------------------------------

create or replace function public.chat_unread_counts()
returns table (league_id uuid, unread bigint)
language sql
stable
security invoker set search_path = public
as $$
  select lm.league_id, count(m.id)
    from public.league_members lm
    left join public.chat_read_state r
      on r.league_id = lm.league_id and r.user_id = lm.user_id
    left join public.chat_messages m
      on m.league_id = lm.league_id
     and m.id > coalesce(r.last_read_message_id, 0)
     and m.user_id is distinct from lm.user_id
     and m.deleted_at is null
   where lm.user_id = auth.uid()
   group by lm.league_id;
$$;

-- 12. Realtime authorization -----------------------------------

create policy "Chat: members receive league topics, users their own topic"
  on realtime.messages for select to authenticated
  using (
    public.is_league_member(public.chat_topic_league_id(realtime.topic()), auth.uid())
    or realtime.topic() = 'user:' || auth.uid()::text
  );

-- Clients may only send on :room topics (typing + presence). Everything on
-- league:{id} and user:{id} comes from the triggers above.
create policy "Chat: members broadcast and track in their league room"
  on realtime.messages for insert to authenticated
  with check (
    realtime.topic() like 'league:%:room'
    and public.is_league_member(public.chat_topic_league_id(realtime.topic()), auth.uid())
  );

-- 13. Lock down internal functions -----------------------------
-- Trigger functions and the name helper are security definer; they must not
-- be callable over /rest/v1/rpc (profile_display_name would otherwise reveal
-- any user's name). Triggers fire regardless of EXECUTE grants.

revoke execute on function
  public.profile_display_name(uuid),
  public.chat_rate_limit(),
  public.chat_reactions_set_league(),
  public.chat_messages_after_insert(),
  public.chat_messages_after_update(),
  public.chat_reactions_after_change(),
  public.chat_league_members_after_change()
from public, anon, authenticated;
