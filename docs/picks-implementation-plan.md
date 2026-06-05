# Picks Feature — Implementation Plan

**Created:** 2026-06-04  
**Status:** In planning  
**Feature:** Leagues, invitations, picks, and leaderboard for the nfl-picks app

---

## Status Board

| PR | Branch | Description | Assignee | Status |
|----|--------|-------------|----------|--------|
| PR 1 | `feat/picks-foundation` | DB schema, server utils, server routes, env | — | ☐ Not started |
| PR 2 | `feat/picks-leagues` | Types, league composables, league pages/components, nav | — | ☐ Blocked on PR 1 |
| PR 3 | `feat/picks-gameplay` | Picks composables, picks page, leaderboard page/components | — | ☐ Blocked on PR 1 |

**Dependency graph:** PR 2 and PR 3 both branch off `feat/picks-foundation`. They can be worked in parallel after PR 1 merges. PR 3 has no dependency on PR 2.

---

## Prerequisites (must be done before any PR starts)

The agent working PR 1 is responsible for confirming these exist. If missing, halt and tell the user.

### New environment variables required

Add all of these to `.env`, `.env.example` (with placeholder values), and Cloudflare Pages project secrets.

| Variable | Where to get it | Example value |
|----------|-----------------|---------------|
| `SUPABASE_SERVICE_KEY` | Supabase dashboard → Project Settings → API → service_role key | `eyJ...` |
| `RESEND_API_KEY` | resend.com → API Keys | `re_...` |
| `INVITE_FROM_EMAIL` | A verified sender domain in Resend | `picks@yourdomain.com` |
| `PUBLIC_SITE_URL` | The deployed app URL | `https://nfl-picks.pages.dev` |

> `SUPABASE_URL` and `SUPABASE_KEY` (anon key) already exist in `.env`.

### Supabase SQL to run manually (after PR 1 writes the files)

1. Run `supabase/migrations/0002_leagues.sql` in the Supabase SQL editor
2. Run `supabase/migrations/0003_storage_league_photos.sql` in the Supabase SQL editor

The bucket creation (`insert into storage.buckets`) must also be done via SQL editor or Supabase dashboard, since the Nuxt app has no migration runner.

---

## Shared Contract

> **Every agent must treat this section as the single source of truth.** Do not deviate from these type names, table names, column names, or route signatures. Inconsistencies between PRs will cause runtime type errors.

### Database Tables

#### `leagues`
```sql
id           uuid primary key default gen_random_uuid()
name         text not null
season_year  int  not null
photo_url    text
created_by   uuid not null references auth.users(id) on delete cascade
created_at   timestamptz not null default now()
```

#### `league_members`
```sql
id         uuid primary key default gen_random_uuid()
league_id  uuid not null references public.leagues(id) on delete cascade
user_id    uuid not null references auth.users(id) on delete cascade
role       text not null default 'member' check (role in ('owner','member'))
joined_at  timestamptz not null default now()
unique (league_id, user_id)
```

#### `picks`
```sql
id               uuid primary key default gen_random_uuid()
league_id        uuid not null references public.leagues(id) on delete cascade
user_id          uuid not null references auth.users(id) on delete cascade
game_id          text not null        -- ESPN event id (string, e.g. "401671819")
picked_team_id   text not null        -- ESPN team id (string, e.g. "12")
created_at       timestamptz not null default now()
updated_at       timestamptz not null default now()
unique (league_id, user_id, game_id)
```

#### `invitations`
```sql
id           uuid primary key default gen_random_uuid()
league_id    uuid not null references public.leagues(id) on delete cascade
email        text not null
token        uuid not null default gen_random_uuid() unique
invited_by   uuid not null references auth.users(id) on delete cascade
status       text not null default 'pending' check (status in ('pending','accepted','revoked'))
created_at   timestamptz not null default now()
accepted_at  timestamptz
```

#### `profiles` (modification — add `email` column)
Add `email text` to the existing `public.profiles` table. Backfill from `auth.users`. Update the `handle_new_user` trigger to also store `email`.

### TypeScript Types (canonical — defined in `app/types/picks.ts`)

```typescript
export interface LeagueRow {
  id: string
  name: string
  season_year: number
  photo_url: string | null
  created_by: string
  created_at: string
}

export interface LeagueMemberRow {
  id: string
  league_id: string
  user_id: string
  role: 'owner' | 'member'
  joined_at: string
}

export interface PickRow {
  id: string
  league_id: string
  user_id: string
  game_id: string
  picked_team_id: string
  created_at: string
  updated_at: string
}

export interface InvitationRow {
  id: string
  league_id: string
  email: string
  token: string
  invited_by: string
  status: 'pending' | 'accepted' | 'revoked'
  created_at: string
  accepted_at: string | null
}

export interface LeagueListItem extends LeagueRow {
  memberCount: number
  role: 'owner' | 'member'
}

export interface MemberView {
  userId: string
  displayName: string      // nickname ?? first+last ?? 'Member'
  avatarUrl: string | null
  role: 'owner' | 'member'
}

export interface LeaderboardEntry {
  userId: string
  displayName: string
  avatarUrl: string | null
  wins: number             // correct picks on FINAL games only
  losses: number           // incorrect picks on FINAL games only
  total: number            // wins + losses
  pct: number              // wins / total; 0 when total === 0
  rank: number             // 1-based; ties share rank
}

export interface PickableGame {
  game: import('~/types/espn').GameView
  pickedTeamId: string | null
  locked: boolean          // true when: in-progress, final, OR kickoff has passed
  correct: boolean | null  // null until final; true/false after
}
```

Also add `email: string | null` to `ProfileRow` in `app/types/auth.ts` after the `avatar_url` field.

### Server Route API Contracts

All routes live under `server/api/`. Errors use `createError({ statusCode, data: { code, message } })`. Auth check via `serverSupabaseUser(event)` — returns 401 if null.

#### `POST /api/invitations`
- File: `server/api/invitations/index.post.ts`
- Request body: `{ leagueId: string; email: string }`
- Auth: caller must be a member of `leagueId`
- Success 200: `{ ok: true; invitationId: string; alreadyMember: boolean }`
- Errors: 400 (invalid body), 401 (not logged in), 403 (not a member), 409 (already invited pending)
- Side effect: inserts `invitations` row; sends email via Resend with link `{PUBLIC_SITE_URL}/invite/{token}`

#### `POST /api/invitations/accept`
- File: `server/api/invitations/accept.post.ts`
- Request body: `{ token: string }`
- Auth: must be logged in; user's email must match `invitations.email` (case-insensitive)
- Success 200: `{ ok: true; leagueId: string }`
- Errors: 401 (not logged in), 403 (email mismatch), 404 (token not found), 410 (already accepted/revoked)
- Side effect: inserts `league_members` row (ignore on conflict); sets invitation `status='accepted'`, `accepted_at=now()`

#### `POST /api/picks`
- File: `server/api/picks/index.post.ts`
- Request body: `{ leagueId: string; gameId: string; pickedTeamId: string }`
- Auth: logged in + must be member of `leagueId`
- Server-side lock check: fetches `/api/schedule` internally, finds game by `gameId`; if `isFinal`, `isInProgress`, or `new Date(game.kickoffUtc) <= new Date()` → reject with 423
- Success 200: `{ ok: true }`
- Errors: 400 (bad body or team not in game), 401, 403 (not member), 423 (game locked)
- Side effect: upserts `picks` row on `(league_id, user_id, game_id)` conflict

### Pick Locking Logic (authoritative — enforced server-side)

A game is locked when **any** of the following is true:
1. `game.isInProgress === true`
2. `game.isFinal === true`
3. `new Date(game.kickoffUtc) <= new Date()`

The client mirrors this logic in `usePicks` to disable the UI early. The server re-checks authoritatively in `POST /api/picks` and returns 423 if locked. Server is authoritative.

### Stats Aggregation Logic (authoritative — in `useLeaderboard`)

```
winnerByGame = Map<gameId, teamId>  // only FINAL games; the competitor with isWinner === true
for each member:
  wins = losses = 0
  for each pick by that member:
    winner = winnerByGame.get(pick.game_id)
    if winner is undefined → skip (game not yet final)
    if pick.picked_team_id === winner → wins++ else losses++
  total = wins + losses
  pct = total === 0 ? 0 : wins / total
sort: wins desc → pct desc → displayName asc (alphabetical tiebreak)
rank: first entry = 1; each subsequent entry shares previous rank if wins AND pct both equal; otherwise rank = index + 1
```

No database aggregation. No cron. Computed on every leaderboard load. Self-heals as ESPN marks games final.

---

## Codebase Conventions (all agents must follow)

These match the existing patterns in the codebase. Read the files listed under each convention before writing any code.

### Composables (`app/composables/`)
- Pattern: `ref<T | null>(null)` + `pending = ref(false)` + `error = ref<Error | null>(null)` + `async function refresh()` + `watch` trigger
- Mutations return `{ ok: boolean; error: string | null }` — see `useProfile.ts:35-44`
- Never call `$fetch` directly in a component — only in composables or pages via composables
- Max 300 lines per file

### Pages (`app/pages/`)
- Thin — fetch data via composables, render state
- Auth-guarded: `definePageMeta({ middleware: 'auth' })`
- Always render `LoadingState`, `ErrorState`, and `EmptyState` cases
- Mobile-first; test at 375px viewport width
- Max 150 lines per file

### Components (`app/components/`)
- Nuxt auto-imports — no import statement needed in pages/composables
- Props typed with TypeScript interfaces (not `defineProps<{...}>` string form)
- Emits typed: `defineEmits<{ eventName: [arg: Type] }>()`
- Max 200 lines per file

### Server routes (`server/api/`)
- Pattern: `export default defineEventHandler(async (event) => { ... })`
- Auth: `const user = await serverSupabaseUser(event)` — `if (!user) throw createError({ statusCode: 401 })`
- Privileged DB ops: `const service = serverSupabaseServiceRole(event)`
- Error shape: `throw createError({ statusCode: N, data: { code: 'SNAKE_CASE', message: '...' } })`
- Reference `server/api/schedule.ts` for the basic pattern
- Max 80 lines per handler file; extract shared logic to `server/utils/`

### Types (`app/types/`)
- Named exports only — no default exports
- ESPN types live in `app/types/espn.ts` (do not modify)
- New picks domain types live in `app/types/picks.ts` (PR 1 creates this file)
- Auth types live in `app/types/auth.ts` (add `email` field only)

### Supabase client usage
- `useSupabaseClient()` — RLS-scoped, use for all user-facing queries
- `serverSupabaseServiceRole(event)` — service role, use ONLY in server routes for privileged ops
- `useAuth()` exposes `{ isLoggedIn, userId }` — `userId` is `Ref<string | null>`

### Styling
- No CSS frameworks — raw CSS in `<style scoped>` blocks
- Dark theme: background `#0a0a0a`, surface `#111`, border `#222`, text `#f0f0f0`, muted `#999`
- Accent: white `#fff` for active/selected states; gold `#fbbf24` for rank-1, silver `#cbd5e1` for rank-2, bronze `#d97706` for rank-3 (leaderboard only)
- `gap`, `flex`, `grid` for layout — no floats
- Global styles in `app/app.vue` (`<style>` block, not scoped): `h1` is `1.4rem 700`, `h2` is `1rem 700 #ccc`

---

## PR 1 — Foundation

**Branch:** `feat/picks-foundation`  
**Target:** `main`  
**Executor:** Primary assistant (not frontend-developer — this PR touches DB, server, and config which are outside that agent's scope)

### What this PR delivers
- Supabase schema for all 4 new tables + `email` on profiles
- Storage bucket for league photos
- `nuxt.config.ts` runtimeConfig for new secrets
- Server utility functions for auth checking and email sending
- All 3 server route handlers

### Files to create

#### `supabase/migrations/0002_leagues.sql`
Full SQL including:
1. `ALTER TABLE public.profiles ADD COLUMN email text` + backfill + updated trigger
2. `CREATE TABLE public.leagues` (with RLS)
3. `CREATE TABLE public.league_members` (with RLS + indexes)
4. `CREATE TABLE public.picks` (with RLS + index)
5. `CREATE TABLE public.invitations` (with RLS + indexes)
6. `security definer` helper functions `is_league_member(league_id, user_id)` and `is_league_owner(league_id, user_id)` — required to prevent RLS infinite recursion
7. All RLS policies (see Shared Contract above)
8. `handle_new_league()` trigger that auto-inserts an `owner` row in `league_members` when a league is created

RLS infinite recursion note: policies on `league_members` MUST NOT query `league_members` directly. Use the `security definer` helper functions instead.

profiles SELECT policy: add a second permissive policy allowing co-members to view each other's profiles (needed for leaderboard display). The existing "viewable by owner" policy stays.

```sql
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
```

#### `supabase/migrations/0003_storage_league_photos.sql`
```sql
insert into storage.buckets (id, name, public)
values ('league-photos', 'league-photos', true)
on conflict (id) do nothing;

create policy "League photos publicly readable"
  on storage.objects for select using (bucket_id = 'league-photos');

create policy "League owner can upload league photo"
  on storage.objects for insert
  with check (
    bucket_id = 'league-photos'
    and public.is_league_owner(((storage.foldername(name))[1])::uuid, auth.uid())
  );

create policy "League owner can update league photo"
  on storage.objects for update
  using (
    bucket_id = 'league-photos'
    and public.is_league_owner(((storage.foldername(name))[1])::uuid, auth.uid())
  );
```

Photo path convention: `{leagueId}/photo.{ext}` — matches the `{userId}/avatar.{ext}` pattern in `useAvatar.ts`.

#### `server/utils/leagueAuth.ts`
Exports:
- `requireUser(event)` → returns `User` or throws 401
- `assertMember(serviceClient, leagueId, userId)` → throws 403 if no `league_members` row
- `assertOwner(serviceClient, leagueId, userId)` → throws 403 if user is not the `leagues.created_by`

#### `server/utils/email.ts`
Exports:
- `sendInvitationEmail({ to, leagueName, inviteUrl, inviterName })` → `Promise<void>`

Uses Resend HTTP API (`https://api.resend.com/emails`). Auth header `Bearer ${config.resendApiKey}`. Read config via `useRuntimeConfig(event)`. HTML email with a clear CTA button linking to `inviteUrl`. Throws on non-2xx response.

#### `server/api/invitations/index.post.ts`
See Shared Contract for full spec. Uses `assertMember`. Sends email via `sendInvitationEmail`.

#### `server/api/invitations/accept.post.ts`
See Shared Contract for full spec. Uses service role to look up invitation by token. Validates `user.email === invitation.email` (case-insensitive). Inserts `league_members` with `onConflict: ignore`. Updates invitation status.

#### `server/api/picks/index.post.ts`
See Shared Contract for full spec. Uses `assertMember`. Internally fetches `/api/schedule` via `$fetch('/api/schedule')` to check game status and kickoff time. Upserts pick.

### Files to modify

#### `nuxt.config.ts`
Add `runtimeConfig` block:
```typescript
runtimeConfig: {
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? '',
  resendApiKey: process.env.RESEND_API_KEY ?? '',
  inviteFromEmail: process.env.INVITE_FROM_EMAIL ?? '',
  public: {
    siteUrl: process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
  },
},
```

#### `.env` and `.env.example`
Add the 4 new variables listed in Prerequisites. In `.env.example`, use placeholder strings. In `.env`, leave blank with a comment (do not put real keys in a committed file).

### PR 1 verification checklist
- [ ] `supabase/migrations/0002_leagues.sql` applied in Supabase SQL editor with no errors
- [ ] `supabase/migrations/0003_storage_league_photos.sql` applied with no errors
- [ ] `league-photos` storage bucket visible in Supabase dashboard
- [ ] Test trigger: insert a row into `leagues` as an authenticated user → confirm a `league_members` owner row auto-created
- [ ] Test RLS: a second auth'd user cannot SELECT that league row
- [ ] `curl -X POST http://localhost:3000/api/picks -H 'Content-Type: application/json' -d '{"leagueId":"x","gameId":"y","pickedTeamId":"z"}'` returns 401 (not logged in)
- [ ] `npm run build` completes without errors

---

## PR 2 — Leagues & Invitations

**Branch:** `feat/picks-leagues` (branched from `feat/picks-foundation`)  
**Target:** `feat/picks-foundation` (retarget to `main` after PR 1 merges)  
**Executor:** `frontend-developer` agent

### What this PR delivers
- All TypeScript types for the picks domain
- League management composables and invitation composables
- Leagues list page, league detail/settings page
- Invite flow including the `/invite/[token]` accept page
- Nav updated with Leagues + Picks links

### Agent handoff prompt

> You are implementing PR 2 of a 3-PR feature. PR 1 (database schema and server routes) is already merged. Your job is the frontend: types, composables, pages, components, and nav changes for the Leagues and Invitations feature.
>
> Read `docs/picks-implementation-plan.md` in full before writing any code. The Shared Contract section is authoritative for all type names, DB column names, and API signatures. The Codebase Conventions section defines the patterns you must follow. Do not deviate from either.
>
> **Scope of this PR — create these files:**
>
> Types:
> - `app/types/picks.ts` — create with the exact type definitions in the Shared Contract
> - `app/types/auth.ts` — add `email: string | null` to `ProfileRow` after `avatar_url`
>
> Composables:
> - `app/composables/useLeagues.ts`
> - `app/composables/useLeague.ts`
> - `app/composables/useInvitations.ts`
> - `app/composables/useAcceptInvite.ts`
>
> Pages:
> - `app/pages/leagues/index.vue`
> - `app/pages/leagues/[id].vue`
> - `app/pages/invite/[token].vue`
>
> Components:
> - `app/components/LeagueCard.vue`
> - `app/components/CreateLeagueModal.vue`
> - `app/components/LeaguePhotoUploader.vue`
> - `app/components/LeagueMemberRow.vue`
> - `app/components/InviteForm.vue`
>
> Modify:
> - `app/app.vue` — add Leagues and Picks nav links
>
> **Do not create** any files in `server/`, `supabase/`, or `nuxt.config.ts` — those belong to PR 1.

### Files to create

#### `app/types/picks.ts`
Exact contents from Shared Contract. All types defined in one file. No default exports.

#### `app/types/auth.ts` — add `email` field
Insert after line 8 (`avatar_url: string | null`):
```typescript
  email: string | null
```

#### `app/composables/useLeagues.ts`
```typescript
// Returns the logged-in user's leagues (all leagues they're a member of)
export function useLeagues(): {
  leagues: Ref<LeagueListItem[]>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
  createLeague: (input: { name: string; season_year: number }) => Promise<{ ok: boolean; id: string | null; error: string | null }>
}
```
- `refresh`: query `league_members` with `.select('role, leagues(*)')` filtered to `user_id`. For each result, also fetch member counts via a second grouped query. Map to `LeagueListItem[]`.
- `createLeague`: insert into `leagues` (`name`, `season_year`, `created_by = userId`). The database trigger auto-creates the `league_members` owner row. Return the new league id.
- Watch `userId` to trigger initial load (same pattern as `useProfile.ts:33`).

#### `app/composables/useLeague.ts`
```typescript
// Returns a single league's detail, members, and admin actions
export function useLeague(leagueId: MaybeRefOrGetter<string>): {
  league: Ref<LeagueRow | null>
  members: Ref<MemberView[]>
  isOwner: Ref<boolean>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
  updateLeague: (patch: { name?: string; season_year?: number; photo_url?: string }) => Promise<{ ok: boolean; error: string | null }>
  removeMember: (userId: string) => Promise<{ ok: boolean; error: string | null }>
  uploadPhoto: (file: File) => Promise<{ url: string | null; error: string | null }>
}
```
- `members`: query `league_members` with `.select('user_id, role, profiles(nickname, first_name, last_name, avatar_url)')`. Map profile to `displayName = nickname ?? "${first} ${last}".trim() ?? 'Member'`.
- `isOwner`: `computed(() => league.value?.created_by === userId.value)`.
- `uploadPhoto`: mirrors `useAvatar.ts` exactly. Bucket `league-photos`, path `${leagueId}/photo.{ext}`. On success, call `updateLeague({ photo_url })`.
- `removeMember`: delete from `league_members` where `league_id = leagueId AND user_id = targetUserId`. RLS ensures only owner can do this.

#### `app/composables/useInvitations.ts`
```typescript
export function useInvitations(leagueId: MaybeRefOrGetter<string>): {
  sending: Ref<boolean>
  invite: (email: string) => Promise<{ ok: boolean; alreadyMember: boolean; error: string | null }>
}
```
- `invite`: `$fetch('/api/invitations', { method: 'POST', body: { leagueId: toValue(leagueId), email } })`. Map thrown error data to `{ ok: false, error }`. Map `alreadyMember` from success response.

#### `app/composables/useAcceptInvite.ts`
```typescript
export function useAcceptInvite(): {
  accepting: Ref<boolean>
  accept: (token: string) => Promise<{ ok: boolean; leagueId: string | null; error: string | null }>
}
```
- `accept`: `$fetch('/api/invitations/accept', { method: 'POST', body: { token } })`. Map response.

### Pages

#### `app/pages/leagues/index.vue`
- `definePageMeta({ middleware: 'auth' })`
- Uses `useLeagues()`
- Renders: page title "Your Leagues", then based on state:
  - `pending` → `<LoadingState />`
  - `error` → `<ErrorState :message="error.message" @retry="refresh" />`
  - `leagues.length === 0` → `<EmptyState message="You're not in any leagues yet." />`
  - Otherwise → grid of `<LeagueCard v-for="league in leagues" :league="league" />`
- "Create League" button always visible (at top right or below empty state). Clicking opens `<CreateLeagueModal>`. On `created(id)` event, `navigateTo('/leagues/' + id)`.

#### `app/pages/leagues/[id].vue`
- `definePageMeta({ middleware: 'auth' })`
- Uses `useLeague(route.params.id as string)` and `useInvitations(route.params.id as string)`
- Top section: league photo (or placeholder) + name + season year
- If `isOwner`:
  - `<LeaguePhotoUploader>` for photo upload/change
  - Inline edit form for name and season_year using `<FormField>` (reuse existing component)
  - "Save" button calls `updateLeague`
- Members list: `<LeagueMemberRow v-for="member in members" :member="member" :canRemove="isOwner && member.role !== 'owner'" @remove="removeMember(member.userId)" />`
- Invite section: `<InviteForm @invite="invite" />` with success/error feedback
- Links at bottom: "View Standings" → `/leagues/${id}/stats`, "Make Picks" → `/picks?league=${id}`

#### `app/pages/invite/[token].vue`
- `definePageMeta({ middleware: 'auth' })` — forces login before the page loads
- Uses `useAcceptInvite()`
- On `onMounted`: call `accept(route.params.token as string)`
- States:
  - `accepting` → `<LoadingState message="Joining league…" />`
  - success → `navigateTo('/picks?league=' + leagueId)`
  - error → `<ErrorState :message="error" />` with a link back to `/leagues`

### Components

#### `app/components/LeagueCard.vue`
- Props: `league: LeagueListItem`
- Renders: card with league photo thumbnail (or initials placeholder), league name, season year, member count, role badge if owner
- Wraps in `<NuxtLink :to="'/leagues/' + league.id">`

#### `app/components/CreateLeagueModal.vue`
- Props: `open: boolean`
- Emits: `close`, `created(id: string)`
- A modal/drawer with `<FormField>` for name (required) and season_year (default to current season year)
- Submit calls `useLeagues().createLeague(...)`. On success emits `created(id)`. Shows inline error if it fails.
- Dismiss on backdrop click or close button emits `close`.

#### `app/components/LeaguePhotoUploader.vue`
- Props: `photoUrl: string | null`, `leagueId: string`
- Emits: `uploaded(url: string)`
- Mirrors `AvatarUploader.vue` (read it first). Bucket is `league-photos`, path is `${leagueId}/photo.{ext}`.
- Shows current photo if exists; file input for upload; progress state; error message.

#### `app/components/LeagueMemberRow.vue`
- Props: `member: MemberView`, `canRemove: boolean`
- Emits: `remove(userId: string)`
- Renders: avatar (initials fallback, same logic as `NavAvatarMenu.vue`), display name, role badge
- If `canRemove`: shows a "Remove" button that emits `remove(member.userId)`. Confirm before emitting (inline confirmation text swap, no JS `confirm()`).

#### `app/components/InviteForm.vue`
- No props (leagueId comes from URL param via parent composable passed as prop `onInvite`)
- Actually: Props: `onInvite: (email: string) => Promise<{ ok: boolean; alreadyMember: boolean; error: string | null }>`
- Emits: none
- Email input + "Invite" button. On submit calls `onInvite(email)`. Shows three states after submit:
  - Success: "Invitation sent to {email}"
  - Already member: "{email} is already in this league"
  - Error: error message

### `app/app.vue` — nav modification

Between the `<NuxtLink to="/teams">Teams</NuxtLink>` and `<div class="nav-spacer" />` lines, add:
```vue
<NuxtLink v-if="isLoggedIn" to="/leagues">Leagues</NuxtLink>
<NuxtLink v-if="isLoggedIn" to="/picks">Picks</NuxtLink>
```

### PR 2 verification checklist
- [ ] `app/types/picks.ts` exists with all types from Shared Contract
- [ ] `ProfileRow` has `email: string | null` field
- [ ] `/leagues` page loads, shows LoadingState, renders league cards for user's leagues
- [ ] "Create League" modal creates a league and redirects to `/leagues/[id]`
- [ ] `/leagues/[id]` shows members list; owner sees edit controls; non-owner does not
- [ ] Photo upload works (requires PR 1 storage bucket)
- [ ] Invite form sends request to `/api/invitations` and shows feedback
- [ ] `/invite/[token]` with a valid token joins the league and redirects to `/picks?league=...`
- [ ] Nav shows Leagues + Picks only when logged in
- [ ] Mobile layout passes at 375px
- [ ] `npm run build` passes with no TypeScript errors

---

## PR 3 — Picks & Leaderboard

**Branch:** `feat/picks-gameplay` (branched from `feat/picks-foundation`)  
**Target:** `feat/picks-foundation` (retarget to `main` after PR 1 merges)  
**Executor:** `frontend-developer` agent

### What this PR delivers
- Picks composable that merges ESPN schedule data with user's picks from Supabase
- Leaderboard composable that aggregates correct picks per member
- Picks page where users select game winners
- Stats/leaderboard page with ranked standings

> **Note:** PR 3 has no dependency on PR 2. It can be worked in parallel with PR 2 after PR 1 merges. It does depend on `app/types/picks.ts` existing — if PR 2 has not been merged yet, create just that types file first (copy exact definitions from Shared Contract) then mark it as "owned by PR 2, do not duplicate."

### Agent handoff prompt

> You are implementing PR 3 of a 3-PR feature. PR 1 (database schema and server routes) is already merged. PR 2 (leagues feature) may or may not be merged yet — if `app/types/picks.ts` doesn't exist, create it first using the exact type definitions in the Shared Contract section of `docs/picks-implementation-plan.md`.
>
> Read `docs/picks-implementation-plan.md` in full before writing any code. The Shared Contract section is authoritative for all type names, DB column names, and API signatures. The Codebase Conventions section defines the patterns you must follow.
>
> **Scope of this PR — create these files:**
>
> Composables:
> - `app/composables/usePicks.ts`
> - `app/composables/useLeaderboard.ts`
>
> Pages:
> - `app/pages/picks.vue`
> - `app/pages/leagues/[id]/stats.vue`
>
> Components:
> - `app/components/LeagueSwitcher.vue`
> - `app/components/PickWeekSection.vue`
> - `app/components/PickGameRow.vue`
> - `app/components/LeaderboardTable.vue`
>
> **Do not modify** `app/app.vue` (handled in PR 2), `app/types/auth.ts`, or any server files.

### Files to create

#### `app/composables/usePicks.ts`
```typescript
export function usePicks(leagueId: MaybeRefOrGetter<string>, seasonYear: MaybeRefOrGetter<number>): {
  games: Ref<PickableGame[]>
  byWeek: Ref<{ week: number; games: PickableGame[] }[]>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
  submitPick: (gameId: string, teamId: string) => Promise<{ ok: boolean; error: string | null }>
}
```

Implementation details:
- Fetch schedule: `$fetch('/api/schedule')` → pass each event through `mapScoreboardEvent` from `~/composables/mapGame`
- Filter games to `seasonYear`: 2025 season games have kickoff before 2026-06-01; 2026 season games have kickoff on or after 2026-06-01
- Fetch this user's picks: `client.from('picks').select('game_id, picked_team_id').eq('league_id', toValue(leagueId)).eq('user_id', userId.value)`
- Build `PickableGame[]` by merging the two: for each `GameView`, find the matching pick (if any), compute `locked` and `correct`
- `locked = game.isFinal || game.isInProgress || new Date(game.kickoffUtc) <= new Date()`
- `correct`: only when `game.isFinal` → find the side with `isWinner === true` → compare its `teamId` to `pickedTeamId`
- `byWeek`: group `games` by `game.week`, sorted ascending. Include a "Playoffs" group for `game.isPlayoff === true` games
- `submitPick`: if locked locally, return early with error. Optimistically update `games`. Call `$fetch('/api/picks', { method: 'POST', body: { leagueId, gameId, pickedTeamId: teamId } })`. On 423 or other error, revert optimistic update and surface the error message.
- Re-fetch on `leagueId` or `seasonYear` change via `watch`

#### `app/composables/useLeaderboard.ts`
```typescript
export function useLeaderboard(leagueId: MaybeRefOrGetter<string>): {
  entries: Ref<LeaderboardEntry[]>
  pending: Ref<boolean>
  error: Ref<Error | null>
  refresh: () => Promise<void>
}
```

Implementation details:
- Fetch in parallel: members (from `league_members` + `profiles` join, same as `useLeague`), all picks for the league (`client.from('picks').select('user_id, game_id, picked_team_id').eq('league_id', id)`), schedule (`$fetch('/api/schedule')` → `mapScoreboardEvent`)
- Build `winnerByGame: Map<string, string>` — only FINAL games; value is the `teamId` of the `isWinner === true` side
- For each member, iterate their picks, score per the Stats Aggregation Logic in Shared Contract
- Sort and assign ranks per Shared Contract
- Watch `leagueId` for changes

### Pages

#### `app/pages/picks.vue`
- `definePageMeta({ middleware: 'auth' })`
- On mount: read `?league` query param. If absent, load `useLeagues()` and default to `leagues.value[0]?.id`. If user has no leagues, show `<EmptyState message="You're not in any leagues." />` with a link to `/leagues`.
- Active league: `ref<LeagueListItem | null>(null)`. Derive `seasonYear` from `activeLeague.value?.season_year`.
- Uses `usePicks(activeLeagueId, seasonYear)`
- Header: league photo (if set) + league name
- If user is in multiple leagues: `<LeagueSwitcher :leagues="leagues" :activeId="activeLeagueId" @change="switchLeague" />`
- `switchLeague(id)`: update `activeLeagueId`, update `?league` query param via `navigateTo({ query: { league: id } }, { replace: true })`
- States: `<LoadingState />`, `<ErrorState />`, or week sections
- For each week: `<PickWeekSection :week="section.week" :games="section.games" @pick="submitPick" />`

#### `app/pages/leagues/[id]/stats.vue`
- `definePageMeta({ middleware: 'auth' })`
- Uses `useLeague(route.params.id)` (for header: league name + photo) and `useLeaderboard(route.params.id)`
- Header: league photo + name + "Standings"
- `<LeaderboardTable :entries="entries" />`
- States: LoadingState, ErrorState, EmptyState ("No picks yet — get your league picking!")
- Link back to `/leagues/${id}`

### Components

#### `app/components/LeagueSwitcher.vue`
- Props: `leagues: LeagueListItem[]`, `activeId: string`
- Emits: `change(id: string)`
- A pill-style selector or dropdown showing league names. Highlights the active league. On click emits `change`.

#### `app/components/PickWeekSection.vue`
- Props: `week: number | string` (string for "Playoffs"), `games: PickableGame[]`
- Emits: `pick(gameId: string, teamId: string)`
- Renders a week header (e.g., "Week 12" or "Playoffs — Wild Card") followed by a list of `<PickGameRow>` components
- Passes `pick` emit through from children

#### `app/components/PickGameRow.vue`
- Props: `pickable: PickableGame`
- Emits: `pick(teamId: string)`
- Layout: two clickable team buttons side by side (away | home). Between them: kickoff time (formatted via `formatDate` from `app/utils/formatDate.ts`) or "FINAL" / "IN PROGRESS" when applicable.
- Each team button shows: team logo, team abbreviation, score (if in progress or final)
- Picked team: highlighted with a white border/background accent
- Locked row: buttons disabled; show a lock icon or "Locked" label
- `correct !== null`: show a green checkmark (correct) or red X (incorrect) on the picked team
- Do NOT call `submitPick` directly — emit `pick(teamId)` and let the page handle it
- Reuse `app/utils/formatDate.ts` for kickoff time formatting

#### `app/components/LeaderboardTable.vue`
- Props: `entries: LeaderboardEntry[]`
- Renders a ranked list. Design requirements:
  - Full-width table or card list — mobile-first, stack on small screens
  - Rank badge: medal colors for rank 1 (#fbbf24 gold), rank 2 (#cbd5e1 silver), rank 3 (#d97706 bronze); numbered badge for all others
  - Each row: rank badge | avatar (initials fallback matching `NavAvatarMenu.vue` logic) | display name | W-L record in large bold type | win percentage bar
  - Win percentage bar: horizontal bar, full width, colored fill proportional to `entry.pct`, subtle background track
  - "You" indicator: highlight the row where `userId === currentUserId` with a subtle left border accent or background tint
  - Ties: entries with the same rank display the same rank badge; no "T-" prefix needed
- Use `useAuth()` to get `userId` for the "You" highlight

### PR 3 verification checklist
- [ ] `/picks` page loads and shows correct game list for the league's season
- [ ] Clicking a team on an unlocked game saves the pick (check Supabase table)
- [ ] Pick persists after page reload
- [ ] Clicking a locked game does nothing; row is visually disabled
- [ ] Server returns 423 for a pick on a started game (test with a known in-progress `gameId`)
- [ ] After ESPN marks a game FINAL, correct/incorrect state renders on the row
- [ ] League switcher changes displayed games to the correct season
- [ ] `/leagues/[id]/stats` leaderboard ranks members correctly by wins
- [ ] "You" row is highlighted
- [ ] Rank 1/2/3 have medal colors
- [ ] Mobile layout passes at 375px for both pages
- [ ] `npm run build` passes with no TypeScript errors

---

## Merge Order

1. PR 1 merges to `main`
2. Retarget PR 2 and PR 3 to `main`
3. PR 2 and PR 3 can merge in either order

---

## File Reference Map

| File | PR | Action |
|------|----|--------|
| `supabase/migrations/0002_leagues.sql` | PR 1 | Create |
| `supabase/migrations/0003_storage_league_photos.sql` | PR 1 | Create |
| `server/utils/leagueAuth.ts` | PR 1 | Create |
| `server/utils/email.ts` | PR 1 | Create |
| `server/api/invitations/index.post.ts` | PR 1 | Create |
| `server/api/invitations/accept.post.ts` | PR 1 | Create |
| `server/api/picks/index.post.ts` | PR 1 | Create |
| `nuxt.config.ts` | PR 1 | Modify |
| `.env` / `.env.example` | PR 1 | Modify |
| `app/types/picks.ts` | PR 2 | Create |
| `app/types/auth.ts` | PR 2 | Modify (add `email`) |
| `app/composables/useLeagues.ts` | PR 2 | Create |
| `app/composables/useLeague.ts` | PR 2 | Create |
| `app/composables/useInvitations.ts` | PR 2 | Create |
| `app/composables/useAcceptInvite.ts` | PR 2 | Create |
| `app/pages/leagues/index.vue` | PR 2 | Create |
| `app/pages/leagues/[id].vue` | PR 2 | Create |
| `app/pages/invite/[token].vue` | PR 2 | Create |
| `app/components/LeagueCard.vue` | PR 2 | Create |
| `app/components/CreateLeagueModal.vue` | PR 2 | Create |
| `app/components/LeaguePhotoUploader.vue` | PR 2 | Create |
| `app/components/LeagueMemberRow.vue` | PR 2 | Create |
| `app/components/InviteForm.vue` | PR 2 | Create |
| `app/app.vue` | PR 2 | Modify (nav links) |
| `app/composables/usePicks.ts` | PR 3 | Create |
| `app/composables/useLeaderboard.ts` | PR 3 | Create |
| `app/pages/picks.vue` | PR 3 | Create |
| `app/pages/leagues/[id]/stats.vue` | PR 3 | Create |
| `app/components/LeagueSwitcher.vue` | PR 3 | Create |
| `app/components/PickWeekSection.vue` | PR 3 | Create |
| `app/components/PickGameRow.vue` | PR 3 | Create |
| `app/components/LeaderboardTable.vue` | PR 3 | Create |
