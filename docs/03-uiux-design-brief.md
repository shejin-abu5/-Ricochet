# UI/UX Design Brief — Ricochet

## 1. Design principles

- **Mobile-first.** Most users will discover/join matches on their phone between plans. Design at 375px width first, scale up.
- **Fast to scan.** Match cards, team cards, and player cards need to communicate status (open/full, live auction, upcoming) in under a second — use color and badges, not paragraphs.
- **Energetic but clean.** Sporty color accents on a mostly neutral/white base — avoid busy backgrounds that fight with content-dense list screens.
- **Trust and status clarity.** Since money-like mechanics exist (bidding), states like "highest bid," "you were outbid," "auction closing in 2m" must be unmistakable — never ambiguous.

## 2. Visual direction

> **Updated in the visual pass.** The original light / green / coral direction
> was replaced by a dark theme built from `docs/SS/homeD.png`. Source of truth
> for every value is the `@theme` block in `src/index.css` — this table
> describes it, the CSS defines it.

| Token | Value | Notes |
|---|---|---|
| Primary | `#d2ff00` lime | Brand accent. **No orange anywhere in the app.** |
| On-primary | `#0d0d0d` | Text/icons on a lime fill — see the contrast note below |
| Canvas | `#0d0d0d` | Page background |
| Surface | `#161616` | Cards, sidebar |
| Raised | `#1e1e1e` | Controls on a card: inputs, chips |
| Hover | `#262626` | Hover/pressed for raised things |
| Border | `#262626` / `#383838` | Default / strong |
| Content | `#f5f5f5` / `#9ca3af` / `#6b7280` | Primary / muted / faint |
| Success · Info · Warning · Danger | green · blue · amber · red | Status only — never brand |
| Font | Inter (400/500/600/700) | Loaded in `index.html` |
| Radius | 12px cards, 8px controls, pill chips | `--radius-card` / `-control` / `-pill` |

### The contrast rule that governs the palette

`#d2ff00` has a relative luminance of **0.85** — brighter than most whites used
on dark UI. Measured:

| Pair | Ratio | |
|---|---|---|
| `#d2ff00` on `#0d0d0d` | 16.7 : 1 | accent text, icons, borders ✅ |
| `#0d0d0d` on `#d2ff00` | 16.7 : 1 | what a lime fill must carry ✅ |
| **white on `#d2ff00`** | **1.16 : 1** | **never — effectively invisible** ❌ |

### How much lime to use

Brightness that high stops meaning anything when it's everywhere, and it is
tiring to read against.

- **Solid lime** — exactly one primary action per screen (`Button variant="primary"`). Nothing else.
- **Tinted lime** (`bg-primary/10` + `text-primary`) — active nav, selected chips, count badges.
- **No lime** — all informational UI. Status uses the semantic colours; ordinary metadata uses the text scale.

Dark theme only. There is no light variant, and `color-scheme: dark` is set on
`<html>` so native controls (scrollbars, date pickers, `<select>` menus,
autofill) render dark too.

## 3. Navigation structure

> **Updated when the sidebar was replaced by a top bar.** The original spec
> here (fixed 240px left sidebar + sticky global search) was built, lived in
> the app for a while, and was replaced — see `docs/18-top-nav-notes.md` for
> what went wrong with it. This section describes what's actually in
> `src/shared/components/Layout.tsx` now.

- **Persistent top bar at every width**, sticky, translucent + `backdrop-blur`, `border-b`. Height and composition follow [playo.co](https://playo.co) (measured: 76px tall, search pill beside the logo, icon+text nav).
  - **Two widths, doing two jobs.** The `<header>` itself is full-bleed, so its background and bottom border span the viewport and the bar reads as a band across the screen. Its inner row is `max-w-6xl px-4 lg:px-6` — byte-for-byte the page container — so the logo lines up with each page's `<h1>` and the account cluster lines up with the page's primary button. The bar spans the window; its *contents* belong to the page.
  - **76px tall at `lg`** (`h-19`), `h-16` on mobile. The extra height is what lets a 44px search pill sit in the bar with breathing room.
  - The row needs ~1030px for logo + search + four icon links + account, against 1104px available at 1440px. `GlobalSearch` carries `w-full max-w-72` and flex-shrinks first, so the squeeze always lands on the one element that degrades gracefully.
- **≥1024px:** logo · search pill · four destinations (centred) · account cluster right.
  - Primary nav is **icon + text**, Phosphor, matching the bottom tab bar.
  - Each icon **animates on hover** — house hops, group leans, transfer arrows swap, trophy tilts. Keyframes are tokens in `src/index.css` (`--animate-icon-*`); the motion matches what each icon depicts rather than being one shared wiggle. Tailwind wraps `group-hover:` in `@media (hover:hover)`, so they never fire from a tap.
  - Active page = **`text-primary` + filled icon weight**, same as the bottom tab bar. (An earlier pass used a lime underline to avoid clashing with Discover's lime filter chips; adding icons made that unnecessary — the outline→fill switch is a stronger signal than a 2px rule, and satisfies `color-not-only` on its own.) `aria-current="page"` comes free from `NavLink`.
- **Global search** (`GlobalSearch.tsx`) lives in the bar from `sm` up. It **works**: submit navigates to `/?q=…` and Discover renders it, because Discover reads its filters from the URL. Placeholder says "Search matches" because matches are all it searches — it grows when teams and players become searchable. Hidden below `sm`, where a logo + search + avatar row leaves the field ~90px wide.
- **<1024px:** bottom tab bar, **max 5 items** — Settings drops, since it's reachable from the account menu and Profile. The top bar shrinks to logo + account.
- **Account cluster** (`UserMenu.tsx`): avatar → popover with Profile, Settings, divider, Log out. Log out is `text-danger` and fenced behind a border — destructive actions get spatial separation. Signed out, the cluster is `Log in` + `Sign up` instead.
  - It is a **popover of links, not `role="menu"`** — claiming the menu role obliges you to implement roving-tabindex arrow-key navigation, and a widget that claims the role without the behaviour is worse than one that never claimed it.
  - `Sign up` uses the **secondary** treatment, not lime. The bar is persistent, so a lime button here would compete with every page's primary action, not just one.
- **The shell's search must always do something.** The original one was `disabled` and wired to nothing, sitting directly above the real search on Discover and Teams; it was deleted for that. The current one is only allowed back because it works end to end. A decorative search field in the shell is a bug, not a placeholder.
  - **Open question:** on Discover this means two search inputs on one screen — the header's and the page's. They are no longer in conflict (both read `?q=` as the source of truth), but the redundancy is real. Removing `MatchFilters`' own input and letting the header own search is the obvious next step, and would cost the `useDeferredValue` demo that input exists to teach.
- Auth screens (login/signup) have no persistent nav — full-screen focused flow.
- Icons: **Phosphor** (`@phosphor-icons/react`), filled when active, outline when not — in the bottom tab bar and the account menu.

## 4. Key screens (wireframe-level description)

### Home / Discover
- Top: search bar + filter chips (Format, Date, Distance)
- Toggle: List view / Map view
- Below: vertical list of `MatchCard`s
- Floating action button: "+ Create match"

### Match detail
- Hero block: format badge, date/time, location with mini-map
- Player avatars in a horizontal scroll, "X / Y joined"
- Sticky bottom bar: Join/Leave button (state-dependent: Join, Leave, Full, Cancelled)

### Team profile
- Header: team logo, name, W-L record badge
- Tabs: Roster | Upcoming matches | Match history
- Captain sees an extra "Manage" tab (invite/remove players)

### Player market
- Grid/list of `PlayerCard`s: avatar, position badge, skill rating, current highest bid, countdown chip
- Tapping a card opens detail with bid history (mini list) and a bid input
- "Closing soon" (< 5 min) listings get a subtle pulsing amber border — the one place we allow a bit of motion, since it signals genuine urgency

### Tournament bracket
- Horizontal scrollable bracket tree on mobile (rounds as columns)
- Each `TournamentMatch` node = mini match-card: two team names/logos, score once played, tap to open full match detail

### Notifications
- Simple list, unread items with a left accent bar and bold text, grouped by day

## 5. Component inventory (build these first — everything else composes from them)

| Component | Used in | Key states |
|---|---|---|
| `Button` | everywhere | primary, secondary, ghost, danger, loading, disabled |
| `Card` | base for Match/Team/Player cards | default, hover, disabled |
| `MatchCard` | Home, Team profile | open, full, live-team-match, cancelled |
| `TeamCard` | Teams list, Market context | — |
| `PlayerCard` | Player market | listed, bid-in-progress, closing-soon, sold |
| `Avatar` | everywhere | with fallback initials |
| `Badge` | status indicators | neutral, success, warning, danger |
| `Modal` | invites, confirmations, bid confirm | — |
| `Toast` | mutation success/error feedback | success, error, info |
| `BidTicker` | Market detail | live-updating current highest bid + countdown |
| `BracketNode` | Tournament bracket | pending, in-progress, completed |
| `FormField` | all forms | default, error, disabled — pairs with React Hook Form |
| `EmptyState` | any list with zero results | — |
| `Skeleton` | loading state for cards/lists while TanStack Query fetches | — |

## 6. Interaction notes worth building deliberately

- **Optimistic join/leave** on match cards — instant visual feedback, silently reconciled.
- **Skeleton loaders**, not spinners, for list screens — feels faster and is the modern convention.
- **Error states are recoverable**, not dead ends — every failed query shows a retry action (TanStack Query's `refetch` wired to a button), not just an error message.
- **Optimistic-but-honest bidding UI** — show your bid as "pending" with a subtle state until the server confirms, since money-adjacent flows shouldn't lie about certainty.

---
Together these four documents define the product scope, the flows, and the visual system the implementation follows.
