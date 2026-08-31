# Ricochet — Architecture & Delivery Plan

> A Playo-style match, team and tournament platform for football. This document covers the stack rationale, the state architecture, the folder convention, and the delivery order.

## Tech stack and rationale

| Layer | Choice | Rationale |
|---|---|---|
| Build tool | Vite | Instant HMR, minimal config, fast production builds. |
| UI library | React 19 | `useOptimistic`, `useTransition` and ref-as-prop remove most of the boilerplate earlier versions needed. |
| Routing | React Router | Client-side routing with nested layouts and route-level access control. |
| Server state | TanStack Query | Fetching, caching, background refetch, retries and stale-while-revalidate, instead of hand-rolled `useEffect` + loading/error state. |
| Global client state | Zustand | Auth session, UI state and live bidding state. A `create()` call and a hook — no provider tree, no action constants. |
| Forms | React Hook Form + Zod | Uncontrolled-by-default forms (fewer re-renders) with a single schema driving both validation and inferred types. |
| Styling | Tailwind CSS v4 | Design tokens declared in `@theme`, consistent spacing and colour without a parallel stylesheet to maintain. |
| API layer | REST, mocked with MSW | The entire frontend is buildable and demoable against realistic fixtures before a backend exists; the same handlers double as test fixtures. |
| Linting | oxlint | Fast enough to run on every save without a watch-mode penalty. |

## State architecture

State is split into three buckets, and the boundary between them is enforced rather than advisory:

1. **Server state — TanStack Query.** Anything that originates from an API and can go stale: matches, teams, invites, bids, tournaments. Cached by query key, invalidated on mutation, never copied into a store.
2. **Global client state — Zustand.** State many components need that does *not* come from an API: the auth session (persisted across reloads), UI state such as toasts and modals, and the ephemeral live-auction state during a player bid.
3. **Local state — `useState`.** Anything scoped to one component: an input value, whether a dropdown is open.

The interesting case is live bidding. It looks like server data, but the in-flight auction — current high bid, countdown, whose turn it is — changes faster than a cache invalidation cycle and is discarded when the auction closes. It belongs in a Zustand store that reconciles against the server on settle, not in the query cache.

Stores are kept small and focused (`authStore`, later `biddingStore`) rather than merged into one, and are read through selectors so a component re-renders only when the field it actually reads changes.

> **Note on Redux:** this project's global client state layer began as Redux Toolkit and moved to Zustand. The `redux-toolkit-version` branch preserves the original implementation for a side-by-side comparison of the same store in both libraries.

## Folder structure

Feature-based (grouped by domain), not type-based (a global `components/`, `hooks/`, `services/` each holding everything):

```
src/
  app/
    queryClient.ts        # TanStack Query client config
    router.tsx            # Route definitions
  features/
    auth/
      components/
      api/                # TanStack Query hooks (useLogin, useSignup)
      authStore.ts        # Zustand store (session, tokens)
    matches/
      components/
      api/                # useMatches, useCreateMatch, useJoinMatch
    teams/
      components/
      api/
    playerMarket/
      components/
      api/
      biddingStore.ts     # Zustand store for live auction state
    tournaments/
      components/
      api/
    profile/
      components/
      api/
  shared/
    components/           # Button, Card, Modal, Avatar, etc.
    hooks/
    utils/
    types/
  main.tsx
```

A domain owns its components, its query hooks and its store together, so a feature can be read, tested or removed in one place. `shared/` is reserved for genuinely cross-feature code.

## Delivery phases

| Phase | Scope | Technical focus |
|---|---|---|
| **0** | Project setup, routing, layout shell | Vite, React Router, folder architecture, design tokens |
| **1** | Signup / login | React Hook Form + Zod, auth store, protected routes, session persistence, `useMutation` |
| **2** | Create, browse and join matches | `useQuery`, query keys and cache invalidation, pagination, optimistic updates |
| **3** | Teams, rosters, invites, team profiles | Nested data modelling, role-based UI (captain vs member), derived state |
| **4** | Player market and bidding | Ephemeral live state in Zustand, polling or WebSocket integration, optimistic UI, race-condition handling |
| **5** | Tournaments and invites | Multi-step forms, bracket data structures, standings derivation, notifications |
| **6** | Hardening | Error boundaries, Suspense, loading skeletons, tests, CI, deployment |

## Definition of done

- Clean commit history, one logical change per commit
- A root `README.md` covering the product, the stack and the architecture
- An ADR recording the Zustand-vs-Query boundary
- Type-check, lint and build all passing

---
Related docs: `01-PRD.md` (scope and requirements), `02-app-flow.md` (screen-by-screen flows), `03-uiux-design-brief.md` (visual direction and component inventory).
