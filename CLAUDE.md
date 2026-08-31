# Ricochet — instructions for Claude Code

Working conventions for this codebase:

- Explain *why* a pattern is used rather than writing code silently, and keep that reasoning in inline comments and in `docs/` so it survives the session.
- When there's a real architectural choice (e.g. "Zustand or Query state?", "controlled vs uncontrolled form"), surface the tradeoff briefly rather than picking silently.
- Match the existing patterns in the codebase rather than introducing new ones — consistency beats any individual "better" pattern.

## Project history worth knowing

The project started with Redux Toolkit for global client state, then migrated to Zustand once the codebase was small enough to compare both cleanly. **The `redux-toolkit-version` git branch still has the original RTK implementation** — point to it when a side-by-side comparison of the same store in both libraries is useful. Don't delete or rewrite that branch.

## Required reading before doing any feature work

Read these in `/docs` before starting a task, since they define scope and architecture decisions already made:

- `docs/00-architecture.md` — tech stack rationale, folder structure convention, and the phase order we're building in. **Always check which phase we're in before building ahead of it.**
- `docs/01-PRD.md` — full feature scope, user stories, acceptance criteria, data model.
- `docs/02-app-flow.md` — screen-by-screen flow for every feature, including which state layer (TanStack Query / Zustand / local) each piece of data belongs in.
- `docs/03-uiux-design-brief.md` — visual direction, component inventory, navigation structure. Reuse the listed components (`Button`, `Card`, `MatchCard`, etc.) instead of inventing new ones.

Numbered notes from `04-` onward are working notes kept locally and excluded from the repo by `.gitignore`. Keep writing them — one per feature or phase, following the existing numbering — but don't expect them in commits.

## Architecture rules to enforce

- **Server data goes in TanStack Query, never Zustand.** If a piece of state comes from an API and can go stale (matches, teams, bids, tournaments), it belongs in a `useQuery`/`useMutation` hook under `features/<feature>/api/`, not in a Zustand store.
- **Zustand is only for global client-only state**: auth session, UI state (toasts, modals), and the live bidding/auction state described in `docs/02-app-flow.md` flow 6. Prefer several small, focused stores (`authStore.ts`, later `biddingStore.ts`) over one giant store — that's idiomatic Zustand, unlike Redux's single-store convention.
- **Folder structure is feature-based**: new code goes under `src/features/<feature>/{components,api}`, not into type-based folders like a global `components/` or `hooks/` directory (those are reserved for `src/shared/` — truly cross-feature reusable code only).
- Read a Zustand store with a selector function (e.g. `useAuthStore((state) => state.isAuthenticated)`) rather than destructuring the whole store, so components only re-render when the specific field they read changes.
- Forms use React Hook Form + Zod, matching the stack decision in the architecture doc.

## Modern React patterns to use (React 19, Vite SPA — not Next.js)

This is a **Vite SPA**, not a Next.js app. Server Components, Server Actions, and `"use client"` do NOT apply here — don't reach for them or suggest them. The relevant modern patterns for this stack are:

- **`useOptimistic`** — prefer this over manually hand-rolled optimistic state for simple cases (join/leave match, placing a bid). Fall back to TanStack Query's `onMutate`/`onError` optimistic pattern when the rollback logic needs to touch the query cache directly.
- **`useTransition` / `startTransition`** — wrap non-urgent state updates (filter changes, tab switches) so urgent updates (typing in a search box) stay responsive.
- **`useDeferredValue`** — for search-as-you-type on match/market lists, to avoid re-filtering on every keystroke.
- **`use()` hook** — for reading context or an already-created promise inline, instead of `useContext` + `useEffect` combos.
- **No `forwardRef` needed** — in React 19, `ref` can be passed as a normal prop.
- **`useSuspenseQuery`** (TanStack Query) — reach for this over `useQuery` + manual loading checks when a component should suspend rather than render its own loading state; pair with an `<ErrorBoundary>` + `<Suspense>` at a sensible boundary (e.g. per page section, not the whole app).
- **React Compiler** — if enabled in the Vite config, avoid manually adding `useMemo`/`useCallback` "just in case." Only add them where profiling shows an actual re-render problem the compiler doesn't already handle.

When a request sounds like it wants Server Components/Actions (e.g. "make this a server action," "add `'use client'`"), flag that this project is a client-only SPA and suggest the closest applicable pattern instead (e.g. a TanStack Query mutation).

## Current status

Shipped: auth with persisted session and protected routes, player profiles, the full match lifecycle (create, discover, filter, join/leave, detail), teams with rosters, invites, join requests and captain-only management, and tournaments with bracket generation and result recording.

Not built: the player transfer market and bidding (`/market` renders a `PagePlaceholder`; designed in `docs/01-PRD.md` §5 and `docs/02-app-flow.md` flow 6), and account settings.

Check `docs/00-architecture.md` for the phase table — work through phases in order unless told otherwise.
