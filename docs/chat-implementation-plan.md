# League Chat — Implementation Plan

**Created:** 2026-09-25  
**Status:** In planning  
**Feature:** Per-league chat with realtime delivery, typing indicators, in-app toasts, incremental history, reactions, and browser push notifications

---

## Status Board

| PR | Branch | Description | Status |
|----|--------|-------------|--------|
| PR 0 | `fix/verify-jwt` | Verify JWT signatures in `requireUser` (prerequisite, see below) | ☐ Not started |
| PR 1 | `feat/chat-foundation` | Migration, types, realtime hub, chat page, history pagination, send | ☐ Blocked on PR 0 |
| PR 2 | `feat/chat-live` | Typing indicator, presence, app-wide toasts, unread badges | ☐ Blocked on PR 1 |
| PR 3 | `feat/chat-reactions` | Reactions + author-only notification | ☐ Blocked on PR 1 |
| PR 4 | `feat/chat-push` | Manifest, service worker, VAPID, push subscriptions, Edge Function, settings UI | ☐ Blocked on PR 2 |
| PR 5 | `feat/chat-extras` | @mentions, edit/delete, replies, system messages, quiet hours | ☐ Blocked on PR 2 |

**Dependency graph:** PR 2 and PR 3 can run in parallel after PR 1. PR 4 needs PR 2's toast/notifier plumbing and the prefs table from PR 1.

**Rough effort:**

| | PR 0 | PR 1 | PR 2 | PR 3 | PR 4 | PR 5 |
|---|---|---|---|---|---|---|
| Hand-built by one developer | < 1 hr | 2–3 days | 1–2 days | 1 day | 2–3 days | 2–3 days |
| With Claude writing the code | minutes | 1–2 hrs | 1–2 hrs | ~1 hr | 1–2 hrs + device testing | 1–2 hrs |

With Claude, most of the elapsed time is human-only steps: reviewing and merging PRs, running the migration SQL, setting secrets and webhooks, and testing on real devices (especially iOS push). Expect PRs 0–3 working in about a day of elapsed time, and PRs 4–5 in about another day.

---

## What exists today (verified 2026-09-25)

| Area | Current state | Impact on chat |
|------|---------------|----------------|
| Backend | Supabase project `nfs-picks` (`lqifvzuaeaofncuhguyx`), Postgres 17 | Realtime, RLS, Edge Functions all available |
| Realtime | `supabase_realtime` publication has **no tables**; **zero** policies on `realtime.messages` | Nothing to undo — we start clean with private Broadcast channels |
| Extensions | `pgcrypto`, `uuid-ossp`, `supabase_vault`; **no `pg_net`** | Database Webhooks (for push) will enable `pg_net` when first created |
| Membership | `league_members(league_id, user_id, role)` + `is_league_member()` / `is_league_owner()` security-definer helpers | Reuse directly in all chat RLS and realtime policies |
| Profiles | `profiles(nickname, first_name, last_name, avatar_url)`; display name = `nickname \|\| full name \|\| 'Member'` (in `server/api/leagues/[id].get.ts`) | Replicate that rule in SQL for broadcast payloads |
| Client | `@supabase/supabase-js` 2.107 via `@nuxtjs/supabase`; `ssr: false` SPA | Private channels + presence supported |
| UI kit | None — hand-rolled scoped CSS, dark theme (`#0a0a0a` / `#111` / `#222`) | Add `vue-sonner` for toasts, styled to match |
| PWA | `public/` has only `favicon.ico`, `robots.txt`; no manifest, no service worker, no icons | All push plumbing is net-new |
| Scale | 2 leagues, 8 members, max 6 per league | One channel per league is trivially within Supabase limits |

---

## Prerequisite — PR 0: `requireUser` does not verify the token

`server/utils/leagueAuth.ts` `requireUser()` base64-decodes the JWT payload and trusts `sub` **without checking the signature**. Every server route then uses the service-role client (which bypasses RLS). Anyone can hand-craft a token with any `sub` and act as that user — e.g. submit picks for someone else, or, with an owner's user id, remove league members.

This is an existing bug, independent of chat, but chat must not add more routes on top of it. Fix before starting:

- Replace the manual decode with `await serverSupabaseUser(event)` from `#supabase/server`, or call `service.auth.getUser(token)` (or verify against the project JWKS) and throw 401 on failure.
- `requireUser` becomes `async`; call sites already `await` it.

The chat design below deliberately keeps almost everything **client → Supabase under RLS**, so it needs very few server routes.

---

## Architecture

```
                         ┌──────────── Supabase ────────────┐
 Browser (SPA)           │                                   │
 ─────────────           │  chat_messages ──trigger──► realtime.send('league:{id}')
 useChatRealtime  ◄──────┼── private channel league:{id}     │   (message + reaction events)
   (app-wide)            │                                   │
 useChatRoom      ◄──────┼─► private channel league:{id}:room│   (typing broadcast + presence)
   (chat page only)      │                                   │
 useChatRealtime  ◄──────┼── private channel user:{me}       │   (reactions to MY messages)
                         │                                   │
 insert/select ──RLS────►│  chat_messages / chat_reactions   │
                         │        │ Database Webhook         │
                         │        ▼                          │
                         │  Edge Function `chat-push` ──────►│── Web Push (FCM / APNs / Mozilla)
                         └───────────────────────────────────┘          │
 Service worker (public/sw.js) ◄─────────────────────────────────────────┘
```

### Key decisions

1. **Writes go straight to Supabase under RLS**, through composables. There's no Worker round trip and no server route, and it avoids the PR 0 problem. The existing `useProfile` already writes directly with the client, so this matches existing code. The one exception is system messages (PR 5), which are written with the secret key by the `chat-system-messages` Edge Function on a `pg_cron` schedule.
2. **Realtime Broadcast from a database trigger** (`realtime.send`) instead of Postgres Changes. Broadcast works with private channels plus RLS on `realtime.messages`, scales better, and lets the trigger add the sender's name and avatar to the payload. That way toasts on any page need no extra fetch.
3. **Split channels by lifetime:**
   - `league:{leagueId}`: persisted events (new, edited, and deleted messages, reaction changes). Subscribed **app-wide** for every league the user belongs to, which is what makes toasts work on any page.
   - `league:{leagueId}:room`: ephemeral events (typing broadcasts and presence). Subscribed **only while the chat page is open**, so keystroke traffic never reaches people who aren't looking.
   - `user:{userId}`: personal events (someone reacted to your message).
4. **A single realtime hub** (`useChatRealtime`) owns the app-wide subscriptions and exposes event hooks. The chat page registers handlers on the hub instead of opening a second channel on the same topic.
5. **`bigint` identity ids on messages**, so keyset pagination is a simple `id < cursor`, with no `(created_at, id)` tie-breaking.
6. **Push is sent server-side by a Supabase Edge Function** triggered by a Database Webhook on insert. The client never sends push, so it can't be skipped or spoofed.

### How the realtime layer works

No new infrastructure. **Supabase Realtime** is a WebSocket server that comes with every Supabase project, and its client is already installed: `@supabase/realtime-js` 2.107 ships inside `@supabase/supabase-js`.

1. **One socket per browser.** The first `client.channel(...).subscribe()` opens a WebSocket to `wss://<project>.supabase.co/realtime/v1`. Every channel (topic) the tab joins is multiplexed over that one socket.
2. **Authorization at join time.** Private channels send the user's access token. Before letting the join through, Realtime checks the RLS policies on `realtime.messages` for that topic, using the same `is_league_member()` function the rest of the app uses. A non-member's join is rejected.
3. **Three features, all used here:**
   - **Broadcast (database → clients):** a trigger on `chat_messages` calls `realtime.send(payload, event, topic, private)`. Realtime fans that out to every socket joined to `league:{id}`. This is how new messages, edits, and reactions arrive.
   - **Broadcast (client → clients):** `channel.send({ type: 'broadcast', event: 'typing', ... })` relays through the server to the other people in `league:{id}:room`. Nothing is stored, which is right for typing events.
   - **Presence:** `channel.track({...})` registers "I'm here". Realtime keeps the shared state and emits `sync`/`join`/`leave` when someone connects or drops, including when a tab is closed abruptly.
4. **Reconnects.** realtime-js reconnects automatically with backoff and re-joins channels. Broadcast doesn't replay missed events, so the chat fetches anything newer than its last message id after reconnecting or waking up.
5. **Token refresh.** `@nuxtjs/supabase` refreshes the session token. realtime-js picks up the new token for existing channels, and the hub calls `client.realtime.setAuth()` once before the first private subscribe.

Minimal shape of the client code:

```ts
const client = useSupabaseClient()
await client.realtime.setAuth()

// app-wide: persisted events for one league
client.channel(`league:${leagueId}`, { config: { private: true } })
  .on('broadcast', { event: 'message_created' }, ({ payload }) => hub.emit('message_created', payload))
  .subscribe()

// chat page only: typing + presence
const room = client.channel(`league:${leagueId}:room`, {
  config: { private: true, presence: { key: userId } },
})
room
  .on('broadcast', { event: 'typing' }, ({ payload }) => markTyping(payload.userId, payload.state))
  .on('presence', { event: 'sync' }, () => (viewers.value = Object.keys(room.presenceState())))
  .subscribe(async (status) => { if (status === 'SUBSCRIBED') await room.track({ onlineAt: Date.now() }) })

room.send({ type: 'broadcast', event: 'typing', payload: { userId, state: 'start' } })
```

**Alternatives considered:**
- **Postgres Changes** (subscribe to table inserts): also built in, but it checks RLS once per subscriber for every change, it's harder to scope to private channels, and the payload can't include the sender's name or avatar.
- **Cloudflare Durable Objects + WebSockets:** the only way to hold sockets on Cloudflare. It would need a separate Worker project, its own auth, its own presence logic, and a paid plan, all to duplicate what Supabase already provides.
- **Pusher / Ably:** another vendor and another auth bridge, with no benefit at this scale.

### Libraries

| Library | Version | Used for | Why |
|---------|---------|----------|-----|
| `vue-sonner` (+ `vue-sonner/nuxt` module) | 2.0.9 | Toast stack | Stacking, swipe to dismiss, pause on hover, `aria-live`, and a `toast.custom()` escape hatch for the avatar layout. `<Toaster :visible-toasts="5" theme="dark" />` |
| `@vueuse/core` + `@vueuse/nuxt` | 15.0.0 | `useIntersectionObserver` (load older), `useDocumentVisibility`, `useThrottleFn` (typing), `useTimeoutFn`, `onLongPress` (reaction picker on mobile), `useTextareaAutosize` (composer), `useIntervalFn` (heartbeat) | Removes a lot of hand-written listener and timer cleanup, and it's auto-imported by the Nuxt module |
| `linkifyjs` | 4.3.3 | Finding URLs in message text | Tokenizes into text/link segments. We render the segments ourselves (never `v-html`) and allow only `http(s)` |
| `jsr:@negrel/webpush` (Deno, Edge Function only) | 0.5.0 | Sending Web Push with VAPID | Built on Web Crypto; the Node `web-push` package won't run in Deno or Workers |
| `web-push` (dev use via `npx`, not installed) | — | `npx web-push generate-vapid-keys` once | Key generation only |

**Not adding:** a PWA module (`@vite-pwa/nuxt`), because a 40-line `sw.js` is simpler with no offline caching; an emoji picker, because the reaction palette is fixed; and a virtual-scroll library, which isn't needed at this scale (revisit past about 5k messages per league).

---

## Shared Contract

> Single source of truth for table, column, event, and type names across PRs.

### Migration `supabase/migrations/0005_chat.sql` (sketch)

```sql
-- ── Messages ────────────────────────────────────────────────
create table public.chat_messages (
  id           bigint generated always as identity primary key,
  league_id    uuid not null references public.leagues(id) on delete cascade,
  kind         text not null default 'user' check (kind in ('user','system')),
  user_id      uuid references auth.users(id) on delete cascade,  -- null for system messages
  body         text not null check (char_length(btrim(body)) between 1 and 2000),
  client_id    uuid not null default gen_random_uuid(),           -- idempotent optimistic send
  system_key   text,                          -- e.g. 'lock-reminder:2026:wk4'; makes cron jobs idempotent
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

alter table public.chat_messages enable row level security;

create policy "League members can read chat"
  on public.chat_messages for select
  using (public.is_league_member(league_id, auth.uid()));

create policy "League members can post as themselves"
  on public.chat_messages for insert
  with check (kind = 'user' and system_key is null
              and user_id = auth.uid() and public.is_league_member(league_id, auth.uid()));
-- System messages are inserted only by security-definer functions run from pg_cron.

-- No UPDATE/DELETE policies: edit + soft-delete go through security-definer
-- functions (edit_chat_message, delete_chat_message) so a user can only touch
-- body/edited_at on their own rows, and the league owner can soft-delete any row.

-- Simple flood guard: max 8 messages per user per 10 seconds.
create or replace function public.chat_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from chat_messages
       where new.kind = 'user' and user_id = new.user_id
         and created_at > now() - interval '10 seconds') >= 8 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger chat_messages_rate_limit before insert on public.chat_messages
  for each row execute function public.chat_rate_limit();

-- ── League bot toggle (PR 5) ───────────────────────────────
alter table public.leagues add column chat_bot_enabled boolean not null default true;

-- ── Mentions (PR 5) ─────────────────────────────────────────
-- Composer stores mentions inline as @[Display Name](user-uuid). An AFTER INSERT
-- trigger parses those tokens, keeps only ids that are league members, and fills:
create table public.chat_mentions (
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  primary key (message_id, user_id)
);
create index idx_chat_mentions_user_id on public.chat_mentions (user_id);
-- RLS: select where is_league_member of the parent message's league. No client writes.

-- Edit / delete RPCs (PR 5), security definer:
--   edit_chat_message(p_id bigint, p_body text)   author only, within 15 min, not deleted → sets body, edited_at
--   delete_chat_message(p_id bigint)              author or is_league_owner → sets deleted_at, deleted_by
-- Both raise on anything else. Their UPDATEs fire the 'message_updated' / 'message_deleted' broadcasts.

-- ── Reactions ───────────────────────────────────────────────
create table public.chat_reactions (
  message_id  bigint not null references public.chat_messages(id) on delete cascade,
  user_id     uuid   not null references auth.users(id) on delete cascade,
  league_id   uuid   not null references public.leagues(id) on delete cascade, -- set by trigger, used by RLS + topic
  emoji       text   not null check (emoji in ('👍','👎','😂','🔥','😮','😢','💯','🏈')),
  created_at  timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);
-- BEFORE INSERT trigger copies league_id from the parent message (runs before RLS WITH CHECK).
-- RLS: select = is_league_member(league_id); insert = user_id = auth.uid() and member; delete = user_id = auth.uid().

-- ── Read state / presence heartbeat ─────────────────────────
create table public.chat_read_state (
  league_id             uuid not null references public.leagues(id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  last_read_message_id  bigint not null default 0,
  last_seen_at          timestamptz,             -- heartbeat while chat is visible; push skips if recent
  primary key (league_id, user_id)
);
-- RLS: all operations where user_id = auth.uid().

-- ── Notification preferences ────────────────────────────────
create table public.chat_notification_prefs (
  league_id       uuid not null references public.leagues(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  muted           boolean not null default false,   -- no toasts/push except @mentions
  push_messages   boolean not null default true,
  push_reactions  boolean not null default true,
  primary key (league_id, user_id)
);
-- RLS: all operations where user_id = auth.uid(). Missing row = defaults.

-- ── Per-user quiet hours (PR 5) ─────────────────────────────
create table public.user_notification_settings (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  quiet_start  time,             -- local time; null = no quiet hours
  quiet_end    time,
  timezone     text not null default 'America/New_York'  -- set from Intl on first save
);
-- RLS: all operations where user_id = auth.uid().

-- ── Push subscriptions (one per browser/device) ─────────────
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
-- RLS: insert/select/delete where user_id = auth.uid(). Edge Function uses the secret key.

-- ── Unread counts RPC ───────────────────────────────────────
create or replace function public.chat_unread_counts()
returns table (league_id uuid, unread bigint)
language sql stable security invoker set search_path = public as $$
  select lm.league_id, count(m.id)
  from league_members lm
  left join chat_read_state r on r.league_id = lm.league_id and r.user_id = lm.user_id
  left join chat_messages m
    on m.league_id = lm.league_id
   and m.id > coalesce(r.last_read_message_id, 0)
   and m.user_id is distinct from lm.user_id
   and m.deleted_at is null
  where lm.user_id = auth.uid()
  group by lm.league_id;
$$;

-- ── Realtime authorization (private channels) ───────────────
create policy "Members receive league + own user topics"
  on realtime.messages for select to authenticated
  using (
    (split_part(realtime.topic(), ':', 1) = 'league'
      and public.is_league_member(split_part(realtime.topic(), ':', 2)::uuid, auth.uid()))
    or realtime.topic() = 'user:' || auth.uid()::text
  );

create policy "Members may broadcast/track in their league room"
  on realtime.messages for insert to authenticated
  with check (
    split_part(realtime.topic(), ':', 1) = 'league'
    and split_part(realtime.topic(), ':', 3) = 'room'
    and public.is_league_member(split_part(realtime.topic(), ':', 2)::uuid, auth.uid())
  );
-- Clients can only *send* on :room topics (typing/presence). Message/reaction
-- events on league:{id} and user:{id} are only ever sent by DB triggers.

-- ── Broadcast triggers ──────────────────────────────────────
-- One AFTER INSERT trigger on chat_messages (chat_messages_after_insert) does, in order:
--   1. parse @[name](uuid) tokens → insert chat_mentions rows (members only)
--   2. realtime.send(payload, 'message_created', 'league:' || league_id, true)
--   payload: { id, leagueId, leagueName, kind, userId, senderName, senderAvatarUrl, body,
--              clientId, replyToId, replyToSnippet, mentionedUserIds, createdAt }
--   senderName uses the same rule as the API: nickname || "first last" || 'Member'
--   (system messages: senderName = 'Picks Bot', senderAvatarUrl = null)
--   Doing both in one function avoids relying on trigger firing order.
-- AFTER UPDATE on chat_messages → 'message_updated' (edit) / 'message_deleted' (soft delete; body omitted)
-- AFTER INSERT/DELETE on chat_reactions → 'reaction_changed' on league:{id}  { messageId, userId, emoji, op }
-- AFTER INSERT on chat_reactions, when reactor ≠ author → 'reaction_received' on user:{authorId}
--   payload: { messageId, leagueId, leagueName, reactorName, reactorAvatarUrl, emoji, snippet }
```

> The project has no migration runner. Run `0005_chat.sql` in the Supabase SQL editor (or via the Supabase MCP `apply_migration`) after PR 1 writes it, same as earlier migrations.

### Realtime events

| Topic | Event | Sender | Subscribed by |
|-------|-------|--------|---------------|
| `league:{id}` | `message_created`, `message_updated`, `message_deleted` | DB trigger | `useChatRealtime` (app-wide) |
| `league:{id}` | `reaction_changed` | DB trigger | `useChatRealtime` → chat page handlers |
| `league:{id}:room` | broadcast `typing` `{ userId, state: 'start' \| 'stop' }` | client | `useChatRoom` (chat page) |
| `league:{id}:room` | presence `{ userId, onlineAt }` | client | `useChatRoom` (chat page) |
| `user:{id}` | `reaction_received` | DB trigger | `useChatRealtime` (app-wide) |

Clients must resolve `userId` → name/avatar from the league members list, **never** trust a name inside a client-sent typing payload.

### Types (`app/types/chat.ts`)

```ts
export interface ChatMessageRow {
  id: number
  league_id: string
  kind: 'user' | 'system'
  user_id: string | null
  body: string
  client_id: string
  system_key: string | null
  reply_to_id: number | null
  created_at: string
  edited_at: string | null
  deleted_at: string | null
  deleted_by: string | null
}

export type ReactionEmoji = '👍' | '👎' | '😂' | '🔥' | '😮' | '😢' | '💯' | '🏈'

export interface ChatReactionSummary {
  emoji: ReactionEmoji
  count: number
  userIds: string[]
  mine: boolean
}

export interface ChatMessageView {
  id: number | null          // null while optimistic / pending
  clientId: string
  kind: 'user' | 'system'
  userId: string | null
  displayName: string
  avatarUrl: string | null
  body: string
  createdAt: string
  editedAt: string | null
  deleted: boolean
  replyToId: number | null
  mentionsMe: boolean
  canEdit: boolean           // author, < 15 min old
  canDelete: boolean         // author or league owner
  reactions: ChatReactionSummary[]
  status: 'sent' | 'pending' | 'failed'
}

export interface MessageCreatedEvent {
  id: number
  leagueId: string
  leagueName: string
  kind: 'user' | 'system'
  userId: string | null
  senderName: string
  senderAvatarUrl: string | null
  body: string
  clientId: string
  replyToId: number | null
  replyToSnippet: string | null
  mentionedUserIds: string[]
  createdAt: string
}

// Props for the custom vue-sonner toast component (ChatToast.vue)
export interface ChatToastProps {
  kind: 'message' | 'reaction' | 'mention'
  avatarUrl: string | null
  senderName: string
  leagueName: string
  snippet: string     // ≤ 80 chars, mention tokens rendered as @Name
  count?: number      // grouped messages from the same sender
  to: string          // route to open on click
}
```

---

## Codebase conventions (apply to every PR)

- All Supabase access goes through composables in `app/composables/`, never in pages or components (per `CLAUDE.md`).
- Pages stay thin. Components use `<script setup lang="ts">` and scoped CSS matching the existing dark palette.
- Mobile first: test at 375px. The chat page uses `100dvh` so the composer stays above the iOS keyboard.
- Render message bodies as **text** (`{{ }}`), never `v-html`. `app/utils/messageSegments.ts` turns a body into `text` / `link` / `mention` segments. Links come from `linkifyjs` `tokenize()` and only `http(s)` is allowed, rendered with `rel="noopener noreferrer" target="_blank"`. Mention tokens `@[Name](uuid)` render as highlighted `@Name` using the *current* member name.
- Prefer VueUse helpers over hand-written listeners and timers (they clean up on unmount automatically).
- Extract the duplicated `initials()` and avatar markup from `MemberAvatarStack.vue` into a shared `UserAvatar.vue` (with a size prop). Chat messages, typing stacks, and toasts all reuse it.

---

## PR 1 — Foundation (`feat/chat-foundation`)

**Files**

| File | Purpose |
|------|---------|
| `supabase/migrations/0005_chat.sql` | Everything in the contract above (all tables are created now, even those used by later PRs, so there's only one manual SQL run) |
| `app/types/chat.ts` | Types above |
| `app/composables/useChatRealtime.ts` | App-wide singleton hub (see below) |
| `app/composables/useLeagueChat.ts` | History, pagination, send, merge realtime events |
| `app/components/UserAvatar.vue` | Extracted avatar |
| `app/components/ChatMessageList.vue` | Scroll container, load-older sentinel, day separators, grouping |
| `app/components/ChatMessage.vue` | One bubble (avatar shown only on first message in a sender run). `kind === 'system'` renders as a centered, muted banner instead of a bubble |
| `app/utils/messageSegments.ts` | Safe text/link/mention segmentation (`linkifyjs`) |
| `app/components/ChatComposer.vue` | Auto-growing textarea (`useTextareaAutosize`); Enter sends, Shift+Enter adds a newline; character counter near the limit |
| `app/pages/leagues/[id]/chat.vue` | Thin page wiring `useLeague` (members map) + `useLeagueChat` |
| `app/pages/leagues/[id]/index.vue` | Add "Chat" link next to "View Standings" / "Make Picks" |
| `nuxt.config.ts`, `package.json` | Add `@vueuse/nuxt` module; add `linkifyjs` |

**`useChatRealtime()`** (singleton via module-level state or `useState`)

- Watches `useAuth().userId` and the user's league list (`useLeagues`). On login it calls `await client.realtime.setAuth()`, then subscribes to `league:{id}` (private) for each league plus `user:{me}`. It tears everything down on logout and adds or removes channels when leagues change.
- Exposes `on(event, handler)` / `off(...)` so `useLeagueChat` and the notifier can listen without opening duplicate channels.
- Tracks the `SUBSCRIBED` / `CHANNEL_ERROR` / `CLOSED` status. On re-subscribe, it emits a `reconnected` event so listeners can fill gaps.
- Removed members: channel authorization is only checked when the channel joins. The member-removal route should also broadcast `member_removed` on `league:{id}`, and the hub then drops that channel for the removed user.

**`useLeagueChat(leagueId)`**

- `messages: Ref<ChatMessageView[]>` in ascending order, plus `hasMore`, `loadingOlder`, and `error`.
- Initial load: `.from('chat_messages').select('*').eq('league_id', id).order('id', { ascending: false }).limit(40)`, then reverse. It also loads reactions for those ids in one query.
- `loadOlder()`: the same query with `.lt('id', oldestId)`. The list component keeps scroll position by recording `scrollHeight` before prepending and restoring `scrollTop += newHeight - oldHeight` after `nextTick`. A top sentinel watched by `useIntersectionObserver` triggers it.
- `send(body)`: generate a `clientId` (`crypto.randomUUID()`), push an optimistic `pending` message, then insert. On success it swaps in the real `id`. On failure it marks the message `failed` with a retry button, and a `RATE_LIMITED` error shows "Slow down a sec". The realtime `message_created` echo is de-duplicated by `clientId`.
- Realtime: new messages append (deduped by `id`/`clientId`); edits, deletes, and reaction changes patch in place.
- **Gap fill**: on `reconnected` or when `useDocumentVisibility()` becomes `visible`, fetch `.gt('id', newestId)` and merge. Without this, messages sent while a phone was asleep go missing.
- Auto-scroll to the bottom only if the user is already within about 120px of it. Otherwise show a "↓ N new messages" pill.
- Names come from the members map in `useLeague`. Authors who have left the league show as "Former member". System messages show as "Picks Bot".
- Updates `chat_read_state.last_read_message_id` (debounced) as the newest message becomes visible.

A virtualized list isn't needed yet. With 40 messages per page and small leagues, even a full season is only a few thousand DOM nodes after heavy scrolling. Revisit if a league passes about 5k messages.

---

## PR 2 — Live presence, typing, toasts, unread (`feat/chat-live`)

**Files:** `useChatRoom.ts`, `useChatToasts.ts`, `useChatUnread.ts`, `ChatTypingIndicator.vue`, `ChatToast.vue`, `ChatNotifier.vue` (renderless), plus edits to `app.vue`, `AppNav.vue`, `LeagueCard.vue`, `nuxt.config.ts` (add `vue-sonner/nuxt`)

**`useChatRoom(leagueId)`** (chat page only)

- Joins `league:{id}:room` (private) with `presence: { key: userId }` and calls `track({ onlineAt })` when subscribed.
- `viewers`: a computed list of members currently in the room. This can show an "online now" avatar strip in the chat header.
- Typing, sending side: on composer input, broadcast `typing:start` at most once every **2.5 seconds** (`useThrottleFn`). Send `typing:stop` on send, on blur, or after 4 seconds without typing.
- Typing, receiving side: keep `Map<userId, expiresAt>` and expire each entry **5 seconds** after its last `start`, so a closed tab never leaves someone "typing" forever. Ignore your own `userId`.
- Heartbeat: while the page is visible (`useIntervalFn` paused by `useDocumentVisibility`), upsert `chat_read_state.last_seen_at = now()` every 30 seconds. PR 4 uses this to skip push for people who are actively viewing.

**`ChatTypingIndicator.vue`**, which stacks sensibly:

| Typers | Display |
|--------|---------|
| 1 | `[avatar] Sam is typing…` |
| 2 | `[av][av] Sam and Jo are typing…` |
| 3 | `[av][av][av] Sam, Jo, and Pat are typing…` |
| 4+ | `[av][av][av] Sam, Jo, and 2 others are typing…` |

Overlapping 18px avatars (up to 3) plus an animated three-dot indicator. The indicator reserves fixed height so the message list doesn't jump.

**Toasts with `vue-sonner`**

- In `app.vue`: `<Toaster theme="dark" :visible-toasts="5" :duration="6000" close-button :position="isMobile ? 'top-center' : 'bottom-right'" :offset="isMobile ? 64 : 24" />`. The mobile offset keeps toasts clear of the sticky nav and away from the chat composer. vue-sonner handles stacking, expand on hover, pause on hover, swipe to dismiss, and `aria-live`.
- Every chat toast is `toast.custom(markRaw(ChatToast), { id, componentProps })`. `ChatToast.vue` renders `UserAvatar`, **sender** · league name, and the one-line snippet (≤ 80 chars). Clicking it navigates to `to` and dismisses the toast. `kind: 'mention'` gets an accent border.
- **Hard cap of 5.** `visibleToasts` only *hides* toasts past the limit, which reappear as others close. The requirement is that the oldest rolls off, so `useChatToasts()` keeps an ordered list of active ids (removed in `onDismiss` and `onAutoClose`) and calls `toast.dismiss(oldestId)` before showing a 6th.
- **Grouping:** the toast id is `msg:{leagueId}:{senderId}`. If that sender posts again while their toast is still open, calling `toast.custom` with the same id updates it in place ("Sam (3)" plus the latest snippet) and restarts its timer. Five slots then mean five different people, not one chatty person.
- Reaction toasts use the id `react:{messageId}`, so several reactions to one message collapse into "Sam and 2 others reacted to your message".

**`ChatNotifier.vue`**: mounted once in `app.vue` next to `<Toaster />`, only when logged in. It listens on the `useChatRealtime` hub:

- `message_created` → toast **unless** the sender is me, **or** I'm currently on `/leagues/{thatLeague}/chat` and the tab is visible, **or** that league is muted. @mentions of me always toast, as `kind: 'mention'`. System messages toast only for pick-lock reminders. It also bumps the unread count.
- `reaction_received` → "Sam reacted 🔥 to your message", with a snippet of the original message.

**Unread badges:** `useChatUnread()` calls `chat_unread_counts()` on login and focus, then updates from hub events. A dot or count appears on the nav "Leagues" link and on each `LeagueCard`. Opening the chat marks it read.

---

## PR 3 — Reactions (`feat/chat-reactions`)

**Files:** `ChatReactionBar.vue`, `ChatReactionPicker.vue`, and edits to `useLeagueChat.ts` and `ChatMessage.vue`

- Desktop: hovering a message shows a small "＋☺" button. Mobile: long-press (about 450ms) opens the picker as a bottom sheet. The picker shows the fixed palette of 8 emoji from the table constraint.
- Chips under the message show `emoji count`. A chip is highlighted if I reacted, and tapping it toggles my reaction (insert or delete). Hover or long-press on a chip lists who reacted.
- Updates are optimistic. Reconciliation comes from `reaction_changed` events, which only the chat page listens for. That's a live refresh, not a notification.
- Author notification: the `reaction_received` trigger fires only when the reactor isn't the author. PR 2's notifier shows the toast, and PR 4's push function sends a push if the author has `push_reactions` enabled.
- Anti-spam: the push function skips a reaction push if the reaction row no longer exists when the push is about to be sent (a quick react-then-unreact). It also collapses repeat reactions on the same message within 60 seconds using the notification `tag`.

A fixed palette keeps the UI compact on mobile and lets the database reject arbitrary strings. A full emoji picker can come later.

---

## PR 4 — Browser push notifications (`feat/chat-push`)

**New environment / secrets**

| Name | Where | Notes |
|------|-------|-------|
| `NUXT_PUBLIC_VAPID_PUBLIC_KEY` | `.env`, Cloudflare Pages | Exposed as `runtimeConfig.public.vapidPublicKey` |
| `VAPID_PRIVATE_KEY` | Supabase Edge Function secrets **only** | Never in Nuxt config |
| `VAPID_SUBJECT` | Edge Function secrets | e.g. `mailto:you@yourdomain.com` |
| `CHAT_WEBHOOK_SECRET` | Edge Function secrets + webhook header | Authenticates the webhook call |

Generate the keys once with `npx web-push generate-vapid-keys`.

**Files**

| File | Purpose |
|------|---------|
| `public/manifest.webmanifest` | `name`, `short_name`, `start_url: "/leagues"`, `display: "standalone"`, `background_color: "#0a0a0a"`, icons |
| `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `badge-72.png` | Required for install and iOS push. None exist today. |
| `public/sw.js` | Hand-written service worker, about 40 lines, with no offline caching. `push` → `showNotification(title, { body, icon, badge, tag, data: { url } })`. `notificationclick` → focus an existing tab and navigate it, or `clients.openWindow(url)`. |
| `public/_headers` | `Cache-Control: no-cache` for `/sw.js` so updates take effect on Cloudflare Pages |
| `nuxt.config.ts` | `app.head` link to the manifest, `theme-color`, and the apple-touch-icon; `runtimeConfig.public.vapidPublicKey` |
| `app/plugins/serviceWorker.client.ts` | Registers `/sw.js` |
| `app/composables/usePushNotifications.ts` | `isSupported`, `permission`, `isSubscribed`, `needsIosInstall`, `enable()`, `disable()` |
| `app/components/NotificationSettings.vue` | On `/profile`: enable or disable push on this device, plus per-league mute and push toggles backed by `chat_notification_prefs` |
| `supabase/functions/chat-push/index.ts` | Edge Function (Deno) |

**`usePushNotifications`**

- Call `Notification.requestPermission()` **only from a button click** ("Enable notifications on this device"), never on page load. Browsers penalize sites that prompt on load, and iOS requires a user gesture.
- `enable()`: `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`, then upsert into `push_subscriptions` (on conflict `endpoint`). `disable()`: unsubscribe, then delete the row.
- `needsIosInstall`: iOS/iPadOS Safari only supports Web Push on **16.4+** and only for a site **added to the Home Screen**. Detect iOS where `navigator.standalone` isn't true, and show "Tap Share → Add to Home Screen to get notifications" instead of the enable button.
- A single, dismissible nudge on the chat page after the user's first sent message ("Get notified when your league chats?") works better than a settings-only toggle.

**Edge Function `chat-push`**

1. It's triggered by **Database Webhooks** (Dashboard → Database → Webhooks) on `INSERT` into `chat_messages` and `chat_reactions`, with the header `x-webhook-secret: $CHAT_WEBHOOK_SECRET`. Creating the webhook enables `pg_net`.
2. It verifies the secret and builds a service-role client.
3. **Message:** recipients are league members, excluding
   - the sender,
   - users with `muted = true` or `push_messages = false`, unless they're @mentioned or replied to (PR 5),
   - users currently in their quiet hours (`user_notification_settings`, PR 5),
   - for system messages, everyone except members with unpicked games (lock reminders only),
   - users whose `chat_read_state.last_seen_at` is within 45 seconds, since they're looking at the chat already.
4. **Reaction:** the only recipient is the message author (skipped if they're the reactor or have `push_reactions = false`). It also re-checks that the reaction still exists.
5. It loads `push_subscriptions` for the recipients and sends with a Web Crypto–based Web Push library for Deno (e.g. `jsr:@negrel/webpush`). The Node `web-push` package depends on Node crypto APIs. The function sets `TTL: 3600` and `urgency: 'normal'`.
6. Payload: `{ title: "Sam in Sunday Degenerates", body: snippet, icon: avatarUrl ?? '/icons/icon-192.png', tag: 'chat-{leagueId}', url: '/leagues/{id}/chat' }`. Using the same `tag` per league makes a busy chat **replace** its notification instead of stacking 20 of them. Add `renotify: true` so it still buzzes.
7. It deletes subscriptions that return **404 or 410** (the browser has discarded them) and updates `last_used_at` on successful sends.

**Backup suppression in the SW:** in the `push` handler, if `clients.matchAll({ type: 'window' })` finds a **focused** client already on `data.url`, skip the notification. This covers the gap between heartbeats.

Deploy with `supabase functions deploy chat-push` (this adds the Supabase CLI to the workflow) or through the Supabase MCP `deploy_edge_function`.

---

## PR 5 — Mentions, edit/delete, replies, system messages, quiet hours (`feat/chat-extras`)

The schema for all of this lands in PR 1's migration (`kind`, `system_key`, `deleted_by`, `chat_mentions`, `user_notification_settings`, and the edit/delete RPCs), so this PR is only application code, the cron job, and the Edge Function.

**@mentions**
- `ChatComposer` opens a member autocomplete after `@` (filtered by display name; arrow keys, Enter, and Tab select; plain `<ul>` popover, no library). Choosing a member inserts `@[Name](uuid)` into the stored text while the textarea shows `@Name`. The composer keeps a small map to convert back and forth.
- The insert trigger fills `chat_mentions` and adds `mentionedUserIds` to the broadcast.
- A mention **always** notifies the mentioned user, both as a toast (`kind: 'mention'`) and as a push, even if the league is muted. Quiet hours still apply to push.
- `@league` notifies everyone. Limit it to the league owner to prevent spam.

**Edit and delete**
- The message menu (the "⋯" on hover for desktop, or `onLongPress` together with the reaction picker on mobile) offers **Reply**, **Edit** (author only, within 15 minutes), **Delete** (author, or league owner on any message), and **Copy text**.
- Edit reuses the composer in "editing" mode and shows "(edited)" on the message afterwards. Delete asks for confirmation, then the message becomes "Message deleted" (or "Removed by the league owner" when `deleted_by ≠ user_id`). Its reactions stay hidden.
- Both go through the `edit_chat_message` / `delete_chat_message` RPCs. The broadcast triggers update every open client.

**Replies**
- **Reply** puts a quoted strip above the composer ("Replying to Sam: …", with an ✕ to cancel). The sent message stores `reply_to_id`.
- Messages render a compact quote above the bubble, using `replyToSnippet` from the broadcast or a lookup in loaded messages. Tapping the quote scrolls to the original, loading older pages until it's found (maximum 5 pages, then "Original message is further back").
- Replying to someone counts as a mention of them for notifications.

**System messages ("Picks Bot")**

Cloudflare Pages has no scheduler, and Postgres can't read the ESPN schedule by itself. So:

- **`pg_cron`** (enable the extension) runs every 15 minutes and calls, via `pg_net`, a second Edge Function, **`chat-system-messages`**, with a secret header.
- The function fetches the ESPN scoreboard and inserts `kind = 'system'` rows using the service role. A unique `system_key` per league makes every job idempotent, so a retry never double-posts.

| Message | When | `system_key` |
|---------|------|--------------|
| "⏰ 3 games kick off in 1 hour — Jo and Pat still have unpicked games in that slot" | About 60 minutes before each distinct kickoff time with at least one unpicked game in the league (Thu, Sun early, Sun late, SNF, MNF…) | `lock:{eventDate}` |
| "🏆 Week 4 winner: Sam (13–3). Season leader: Jo" | Once all of the week's games are `STATUS_FINAL` | `week-winner:{season}:{week}` |
| "👋 Pat joined the league" | On `league_members` insert (database trigger, no cron) | `joined:{userId}` |

- Weekly winners must use exactly the same scoring rules as the leaderboard. Move the scoring logic from `useLeaderboard.ts` into `shared/utils/scoring.ts`, next to the existing `shared/utils/season.ts`, so the page and the Edge Function share one implementation. The Edge Function imports it at build time.
- Lock reminders push only to members with unpicked games. Other system messages post silently (unread badge only).
- A per-league setting (owner only, in `LeagueSettings.vue`) turns the bot off. It's stored as `leagues.chat_bot_enabled boolean default true`, which also belongs in the PR 1 migration.

**Quiet hours**
- In `NotificationSettings.vue`: "Pause push notifications from [11:00 PM] to [8:00 AM]". The timezone is set automatically from `Intl.DateTimeFormat().resolvedOptions().timeZone`.
- The `chat-push` function skips push for users currently in quiet hours. In-app toasts and unread badges are unaffected.

**Retention:** keep everything for now. At this scale storage is negligible.

---

## Supabase limits sanity check

The free tier allows about 200 concurrent Realtime connections and 2M messages per month. One browser is one connection no matter how many channels it joins. Typing is throttled to one event every 2.5 seconds per active typist. With about 8 users, usage is a tiny fraction of the limits.

---

## Testing checklist

- [ ] Two browsers, two users in the same league: a message appears live in both, and the sender sees no toast of their own message
- [ ] User B on `/schedule` gets a toast with avatar, name, league, and snippet; clicking it opens the chat
- [ ] Send 7 messages from 7 different sources quickly: at most 5 toasts, oldest removed first
- [ ] Typing indicator: one, two, and four typers display correctly; closing a typer's tab clears them within about 5 seconds
- [ ] Seed about 500 messages (`supabase/seeds/chat_test.sql`): first paint shows 40, scrolling up loads more without the view jumping
- [ ] Put a phone to sleep, send 3 messages, wake it: all 3 appear (gap fill)
- [ ] User in league X cannot select, insert, or subscribe to league Y's chat (try both the REST call and joining `league:{Y}` directly)
- [ ] Removed member stops receiving events immediately
- [ ] Reaction: live chip update for viewers; only the author gets a toast and push; self-reaction notifies no one
- [ ] Push: Chrome desktop, Android Chrome, iOS 16.4+ home-screen app; no push while actively viewing the chat; a revoked subscription is removed after a 410
- [ ] 375px layout: composer stays above the keyboard; toasts don't cover the composer
- [ ] Message containing `<script>` and `javascript:` links renders inertly
- [ ] One sender posting 4 quick messages produces one grouped toast ("Sam (4)"), not four
- [ ] @mention in a muted league still toasts and pushes; `@league` is rejected for non-owners
- [ ] Edit after 15 min is refused; owner delete shows "Removed by the league owner" for everyone live
- [ ] Reply quote jumps to the original, loading older pages if needed
- [ ] Lock reminder posts once per kickoff slot (run the cron function twice and confirm no duplicate)
- [ ] Weekly winner matches the Standings page for the same week
- [ ] Quiet hours suppress push but not toasts
