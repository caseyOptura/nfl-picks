# Build Plan — Initial Site

## Task type
New feature — frontend only (Nuxt 4, external ESPN API, no backend)

---

## Feature scope

### Schedule page (`/schedule`)
- Lists the full season schedule
- Games already played show the final result (score + winner)
- Upcoming games show date, time, and venue

### Teams page (`/teams`)
- Grid/list of all 32 NFL teams with logo and name
- Clicking a team navigates to the team detail page

### Team detail page (`/teams/[id]`)
- Team metadata (logo, colors, full name, conference, division)
- Current season win/loss record
- Game-by-game history for played games (opponent, result, date, venue)
- Upcoming games for the rest of the season
- "Players" button that reveals the roster with per-player stats

---

## Execution plan

### 1. `implementation-planner` — sequential
Map out page structure, composables for ESPN API calls, component breakdown,
and TypeScript interfaces before any code is written. Prevents rework across
three interconnected pages.

### 2. `frontend-developer` — sequential
Build all three views (Schedule, Teams list, Team detail + Players) against
the plan from step 1, using `useAsyncData`/`$fetch` composables wrapping the
ESPN endpoints.

### 3. `typescript-enforcer` — sequential
Validate types on ESPN response shapes, composable return types, and prop
interfaces across all components.

### 4. `chrome-visual-tester` — sequential
Spin up the dev server and visually confirm the schedule grid, team cards,
team detail layout, and player stats table before calling it done.

---

## Notes
- All data from the ESPN unofficial API — no auth, no signup required
- Routes needed: `/schedule`, `/teams`, `/teams/[id]`
- Players are toggled on the team detail page, not a separate route
- The ESPN scoreboard endpoint returns both upcoming and completed games
- If any file exceeds **200 lines** (components) or **300 lines** (composables),
  decompose before continuing
