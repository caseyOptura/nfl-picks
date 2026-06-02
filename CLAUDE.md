# CLAUDE.md — nfl-picks

NFL schedule, team stats, and player stats app built in Nuxt 4.
All data comes from the ESPN unofficial API — no auth, no API keys required.

## Stack

- **Nuxt 4** (Vue 3 Composition API, `<script setup>`)
- **TypeScript** throughout
- **ESPN unofficial API** — see `docs/espn-api.md` for all endpoints
- No backend — all data fetched client-side or via Nuxt server routes if CORS requires it

## Project structure

```
app/
  pages/          ← file-based routing
  components/     ← shared UI components
  composables/    ← useAsyncData / useFetch wrappers for ESPN API
  assets/         ← global styles
docs/
  espn-api.md     ← ESPN API endpoint reference
  build-plan.md   ← feature build plan and agent execution order
```

## Key conventions

- All ESPN API calls go through composables in `app/composables/` — never call `$fetch` directly in a component or page
- TypeScript interfaces for ESPN response shapes live in `app/types/`
- Pages are thin — data fetching and logic belong in composables
- Mobile-first layout; test at 375px width

## Agents and commands available

- `/route <task>` — classify a task and produce an agent execution plan
- `frontend-developer` agent — implements Nuxt 4 components, pages, composables

## Pre-commit hooks

File size guard lives in `.pre-commit-hooks/check-file-size.sh`.
To activate: `pre-commit install` (requires `pip install pre-commit`).
Config: `.pre-commit-config.yaml`.

## Build and dev

```bash
npm run dev      # start dev server at http://localhost:3000
npm run build    # production build
npm run preview  # preview production build
```

## Data reference

All ESPN endpoints documented in `docs/espn-api.md`.
Key ones:
- Teams: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams`
- Schedule: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20250901-20260201&limit=500`
- Team detail: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}`
- Roster: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{id}/roster`
