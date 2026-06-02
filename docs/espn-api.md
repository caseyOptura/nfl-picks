# ESPN API Reference

Unofficial, no auth required. All endpoints are plain HTTP GET — no API key needed.

Two base URLs:
- **`site.api.espn.com`** — pre-assembled responses, best for most use cases
- **`sports.core.api.espn.com`** — granular/raw data, used for standings and venues

---

## Teams

### All teams
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams
```
Returns all 32 NFL teams. Each team includes:
- `id`, `abbreviation`, `displayName`, `shortDisplayName`
- `color`, `alternateColor`
- `logos[]` — array of logo image URLs (different sizes)
- `record` — current season W/L

### Single team
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}
```
Same shape as above but for one team. Also includes `venue` and `links`.

---

## Schedule & Scoreboard

### Current week scoreboard
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard
```

### Full season scoreboard (date range)
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=20250901-20260201&limit=500
```
Each event in the `events[]` array includes:
- `id`, `name`, `shortName`
- `date` — ISO 8601 game time
- `status.type.name` — `STATUS_SCHEDULED`, `STATUS_IN_PROGRESS`, `STATUS_FINAL`
- `competitions[0].competitors[]` — home and away teams with scores
- `competitions[0].venue` — `fullName`, `address.city`, `address.state`
- `competitions[0].broadcasts[]` — TV network info

### Team schedule (single team, full season)
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/schedule
```

---

## Standings

### Conference/division standings
```
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/groups/{groupId}/standings
```
Group IDs:
- `1` — AFC
- `2` — NFC

Returns wins, losses, ties, winning percentage, points for/against per team.

---

## Players & Roster

### Team roster
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/teams/{teamId}/roster
```
Returns `athletes[]` grouped by position. Each athlete includes:
- `id`, `fullName`, `displayName`, `position.abbreviation`
- `jersey`, `age`, `experience.years`
- `headshot.href` — player photo URL

### Single player
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/athletes/{athleteId}
```

### Player stats (current season)
```
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2025/types/2/athletes/{athleteId}/statistics
```

---

## Venues

### Venue detail
```
GET https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/venues/{venueId}
```
Returns full name, city, state, capacity, surface type, and indoor/outdoor flag.

---

## News

### NFL news feed
```
GET https://site.api.espn.com/apis/site/v2/sports/football/nfl/news
```

---

## Tips

- Append `?limit=500` to list endpoints to avoid pagination cutting off results
- Logo URLs from the API are CDN-hosted and can be used directly in `<img>` tags
- Game `date` fields are UTC — convert to local time in the UI
- `STATUS_FINAL` means the game is complete and scores are available
- The scoreboard endpoint is the single best source for schedule + results combined

---

## Reference
- [NFL endpoints gist](https://gist.github.com/nntrn/ee26cb2a0716de0947a0a4e9a157bc1c)
- [Public ESPN API docs](https://github.com/pseudo-r/Public-ESPN-API)
