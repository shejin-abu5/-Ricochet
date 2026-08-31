# Ricochet

**A complete platform for organising football matches, running teams, and managing tournaments.**

Ricochet takes a casual pickup game from "does anyone want to play Saturday?" all the way to a scheduled, refereed tournament with standings — in one product. Players discover and join open matches near them. Captains register a club, recruit players through invites and join requests, and manage the roster. Free agents list themselves on a transfer market where clubs bid for them in a timed auction. Organisers spin up a knockout or round-robin tournament, invite teams, and let results feed the bracket automatically.

Inspired by [Playo](https://playo.co/), extended with the competitive layer that pickup apps leave out.

## What it does

| Area | Capabilities |
|---|---|
| **Matches** | Create a match with venue, kick-off time, format (5v5 / 7v7), slot count and skill level. Browse and filter by location, date and format. Join or leave with instant optimistic feedback; full matches lock automatically. |
| **Teams** | Register a club with name, crest and home ground. Invite players, manage the roster with captain-only permissions, and track a win/loss record and match history on the team profile. |
| **Squad recruitment** | Players request to join a club; captains review and approve join requests, or invite players directly. |
| **Player market** *(designed, not yet built)* | Free agents list themselves for transfer. Clubs browse available players and bid inside a time-boxed auction window, with counter-bids and outbid notifications. The winning bid moves the player onto the roster. |
| **Tournaments** | Organisers create a knockout or round-robin competition, invite teams, auto-generate the bracket or schedule, and record results that flow straight into standings and bracket progression. |
| **Accounts** | Email/password auth with a persisted session, protected routes, and a player profile carrying position, skill level and avatar. |

## Tech stack

| Layer | Choice |
|---|---|
| Build tool | Vite |
| Language | TypeScript |
| UI | React 19 |
| Routing | React Router |
| Server state | TanStack Query |
| Global client state | Zustand |
| Forms | React Hook Form + Zod |
| Styling | Tailwind CSS v4 |
| API mocking | MSW |
| Linting | oxlint |

### Architecture at a glance

- **Strict state separation.** Anything that comes from the API and can go stale — matches, teams, bids, tournaments — lives in TanStack Query. Zustand holds only global client state: the auth session, UI state, and live auction state. No server data is ever mirrored into a store.
- **Feature-sliced structure.** Each domain owns its components, its query hooks and its store, so a feature can be read, tested or removed in one place.
- **Small, focused stores.** Several narrow Zustand stores read through selectors, rather than one monolithic store, so components re-render only on the fields they actually read.
- **Optimistic by default.** Joining a match or placing a bid updates the UI immediately and reconciles against the server response, with rollback on failure.

## Getting started

```bash
npm install
npm run dev
```

The app runs against an MSW mock API, so no backend is required to explore it. Sign in with **`test@ricochet.dev`** / **`password123`**, or create an account — signup works against the same mock layer.

Type-check, lint and build:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

## Project structure

```
src/
  app/            # query client, router — app-wide wiring
  features/       # one folder per domain (auth, matches, teams, playerMarket, tournaments)
    <feature>/
      components/
      api/        # TanStack Query hooks live here
      <feature>Store.ts   # only if the feature needs global client state (Zustand)
  shared/         # reusable components, hooks, utils, types
```

## Roadmap

| Area | Status |
|---|---|
| Auth, protected routes, persisted session | ✅ Shipped |
| Player profiles | ✅ Shipped |
| Match creation, discovery, filtering, join/leave, full match lifecycle | ✅ Shipped |
| Teams, rosters, invites, captain permissions, team management | ✅ Shipped |
| Tournaments — creation, brackets, result recording, standings | ✅ Shipped |
| Player transfer market and live bidding | Designed — build pending |
| Account and notification settings | Planned |

Payments, live streaming and native mobile apps are deliberately out of scope; the web app is responsive-first.
