import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  House,
  UsersThree,
  ArrowsLeftRight,
  Trophy,
  User,
  Gear,
  type Icon,
} from '@phosphor-icons/react'
import { useAuthStore } from '../../features/auth/authStore'
import { queryClient } from '../../app/queryClient'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'
import { ToastViewport } from './Toast'

/**
 * ============================================================
 *  THE APP SHELL — top bar on desktop, tab bar on mobile
 * ============================================================
 *
 * ---- WHY THE SIDEBAR WENT AWAY ----
 *
 * The original shell (built from docs/SS/homeD.png) was a fixed 240px left
 * sidebar. It was faithful to the reference and it was wrong for this app, for
 * a reason that only showed up once there were real pages in it:
 *
 * A sidebar is a good container for MANY destinations — a dashboard with
 * twelve sections, where the column is full and scanning it is the fastest way
 * around. Ricochet has four. So below "Settings" sat roughly 500px of empty
 * surface, running the full height of every screen. Permanent, empty chrome
 * reads as "admin dashboard", which is not what a pickup-football app is.
 *
 * Four destinations fit comfortably in one horizontal row, and that row costs
 * 64px of height ONCE instead of 240px of width forever.
 *
 * ---- WHY THE GLOBAL SEARCH BAR WENT AWAY ----
 *
 * It was `disabled`, wired to nothing, and — worse — Discover and Teams each
 * render their own real, working search input about 150px below where it sat.
 * Every list screen showed the user two search boxes, one of which silently
 * did nothing. Deleting it removes a dead control AND an ambiguity.
 *
 * Cross-entity search comes back as a real feature when there's an endpoint
 * behind it, and it will live in this bar. It doesn't get to squat here first.
 *
 * ---- WHAT THE BREAKPOINT DOES NOW ----
 *
 * Below lg (1024px): bottom tab bar, unchanged — navigation stays under the
 * thumb, which is the whole argument for bottom tabs, and nothing about that
 * argument changed. The top bar shrinks to logo + account.
 *
 * At lg and up: the nav links appear in the top bar.
 *
 * ---- A BUG THIS FIXED ON THE WAY PAST ----
 *
 * The log-out button used to live in the sidebar, and the sidebar was
 * `hidden lg:flex`. So on a phone there was no way to log out at all. It's in
 * the account menu now, which renders at every width.
 */

interface NavItem {
  to: string
  label: string
  icon: Icon
  /**
   * The hover animation for this item's icon in the desktop bar.
   *
   * It lives on the DATA rather than inside TopNavLink because each icon gets
   * its own motion — the house hops, the trophy tilts. A single shared wiggle
   * would be decoration; motion that matches what the icon depicts is the
   * `motion-meaning` rule. Keyframes are in src/index.css.
   *
   * Full class strings, never `group-hover:animate-icon-${name}` — Tailwind
   * scans source files as plain text and cannot see a class that only exists
   * once a template literal has been evaluated. An interpolated name would
   * compile to nothing at all.
   */
  iconAnimation?: string
  /** Kept out of the mobile tab bar to stay within the five-item limit. */
  hideOnMobile?: boolean
}

const primaryNav: NavItem[] = [
  { to: '/', label: 'Home', icon: House, iconAnimation: 'group-hover:animate-icon-hop' },
  { to: '/teams', label: 'Teams', icon: UsersThree, iconAnimation: 'group-hover:animate-icon-lean' },
  {
    to: '/market',
    label: 'Transfer Market',
    icon: ArrowsLeftRight,
    iconAnimation: 'group-hover:animate-icon-swap',
  },
  {
    to: '/tournaments',
    label: 'Tournaments',
    icon: Trophy,
    iconAnimation: 'group-hover:animate-icon-tilt',
  },
]

/**
 * Account destinations. These no longer appear in the desktop bar — they live
 * in <UserMenu> — but the mobile tab bar still draws Profile from here, so the
 * two navs keep sharing one source of truth.
 */
const accountNav: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Gear, hideOnMobile: true },
]

/**
 * One link in the desktop top bar: icon + label, with the icon animating on
 * hover.
 *
 * ---- THE ACTIVE STATE IS COLOUR + ICON WEIGHT, NOT AN UNDERLINE ----
 *
 * An earlier pass used a lime underline here, to avoid clashing with the lime
 * PILLS on Discover's filter chips. Adding icons changed that calculation:
 * Phosphor switches between outline and filled via its `weight` prop, so the
 * active item now differs from its neighbours in glyph shape as well as
 * colour. That's a stronger, more legible signal than a 2px rule, it's what
 * the reference does, and it's already the pattern the bottom tab bar uses —
 * so the two navs finally agree with each other.
 *
 * The `color-not-only` rule is satisfied by the fill/outline switch, which a
 * colourblind user reads perfectly well. `aria-current="page"` comes free from
 * NavLink for screen readers.
 *
 * ---- WHY `group` IS ON THE LINK AND NOT THE ICON ----
 *
 * The animation should fire when you hover ANY part of the link — the label
 * included — not only the 22px of icon. Tailwind's `group` marks the hover
 * boundary; `group-hover:` on the child reacts to it. Hovering the word
 * "Tournaments" tilts the trophy, which is what you'd expect.
 */
function TopNavLink({ item }: { item: NavItem }) {
  const IconComponent = item.icon

  return (
    <NavLink
      to={item.to}
      // `end` stops "/" matching every route — without it Home reads as active
      // on every page in the app.
      end={item.to === '/'}
      className={({ isActive }) =>
        `group flex items-center gap-2 rounded-control px-3 py-2 text-meta font-medium transition-colors ${
          isActive ? 'text-primary' : 'text-content-muted hover:bg-raised hover:text-content'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <IconComponent
            size={22}
            // Filled when active, outline when not — the second, redundant
            // signal for the current location.
            weight={isActive ? 'fill' : 'regular'}
            className={item.iconAnimation}
          />
          {item.label}
        </>
      )}
    </NavLink>
  )
}

export function Layout() {
  // Selectors, as always — this component re-renders only when these specific
  // fields change, not on every unrelated auth-store write.
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  // Logging out clears TWO things on purpose: Zustand's session (who you are)
  // and the Query cache (everything you fetched while logged in). Skipping
  // queryClient.clear() would leave the next person to log in on this device
  // briefly looking at the previous user's teams and invites.
  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login')
  }

  const mobileNav = [...primaryNav, ...accountNav].filter((item) => !item.hideOnMobile)

  return (
    <div className="min-h-dvh bg-canvas">
      {/**
       * SKIP LINK — invisible until focused, then the first thing a keyboard
       * user reaches. It matters less than it did against a 6-link sidebar,
       * but it still saves tabbing the whole bar on every page load.
       */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-meta focus:text-on-primary"
      >
        Skip to content
      </a>

      {/* ---------- TOP BAR ---------- */}
      {/**
       * `sticky`, not `fixed`. A sticky header participates in normal document
       * flow, so the content below simply starts underneath it — no manual
       * top-padding to keep in sync, and nothing to forget when the bar's
       * height changes. (The bottom tab bar IS fixed, which is exactly why
       * <main> below needs an explicit pb-24 to clear it.)
       *
       * The translucent background + backdrop-blur means content scrolling
       * underneath stays faintly visible, which reads as depth rather than as
       * a lid. z-30 keeps it above page content but below the toast viewport.
       */}
      <header className="sticky top-0 z-30 border-b border-border bg-canvas/80 backdrop-blur">
        {/**
         * ---- THE ROW IS THE PAGE CONTAINER; THE BAR IS NOT ----
         *
         * Two different widths are doing two different jobs here, and it's
         * worth being clear about which is which:
         *
         *   <header>  full-bleed. Its background and bottom border run the
         *             whole viewport, so the bar still reads as a band across
         *             the screen.
         *   this row  `max-w-6xl` + `px-4 lg:px-6` — byte-for-byte the
         *             container every page uses (see DiscoverPage's
         *             `p-4 lg:p-6` inside <main>'s max-w-6xl).
         *
         * So the logo sits on exactly the same vertical line as the page's
         * <h1> below it, and the account cluster on the same line as the
         * page's "+ Create" button. The bar spans the window; its CONTENTS
         * belong to the page.
         *
         * That alignment is most of what stops a top bar reading as chrome
         * bolted onto the page rather than part of it — one shared number,
         * and almost nobody could tell you it's there.
         *
         * Note this is the narrower option (1152px of usable width at 1440px
         * rather than 1344px), which is fine: the row needs about 1030px for
         * logo + search + four icon links + account. The search field carries
         * `w-full max-w-72` and flex-shrinks first, so the squeeze lands on
         * the one element that degrades gracefully.
         *
         * ---- HEIGHT ----
         *
         * h-19 = 76px at lg, up from 64px, matching the reference exactly. The
         * extra 12px is what lets a 44px-tall search pill sit inside the bar
         * with real breathing room rather than being wedged in. Mobile stays
         * at h-16 — vertical space is scarcer there and there's less in the
         * bar to hold.
         */}
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:h-19 lg:gap-6 lg:px-6">
          {/* The logo is a link home. Users expect that of a wordmark, and it
              costs nothing to honour. */}
          <Link
            to="/"
            className="shrink-0 rounded-control text-xl font-bold text-primary"
            aria-label="Ricochet — home"
          >
            Ricochet
          </Link>

          {/**
           * Search sits beside the logo, where the reference puts its location
           * pill. Hidden below `sm`: at 375px a logo, a search field and an
           * avatar in one 64px row leaves the search about 90px wide, which is
           * not a usable input. Discover's own search is a tap away there.
           */}
          <GlobalSearch className="hidden w-full max-w-72 sm:block" />

          {/**
           * nav landmark: lets screen-reader users jump straight here.
           *
           * `mx-auto` on a flex child means "equal automatic margins either
           * side" — which centres the nav in whatever space is left after the
           * logo, the search and the account cluster have taken theirs. It
           * stays centred as those change width, with no magic numbers.
           */}
          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
            {primaryNav.map((item) => (
              <TopNavLink key={item.to} item={item} />
            ))}
          </nav>

          {/**
           * `ml-auto` pins this right when the nav is hidden (below lg).
           * At lg the nav's own `mx-auto` already pushes it here, so the extra
           * auto margin is removed to keep the nav's centring honest.
           */}
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            {user ? (
              <UserMenu name={user.name} onLogout={handleLogout} />
            ) : (
              /**
               * Signed-out state. The sidebar never had one — a logged-out
               * visitor had no route into auth from the shell at all, and with
               * the avatar slot now sitting empty the gap would be obvious.
               *
               * ---- WHY THESE AREN'T <Button> ----
               *
               * <Button> renders a <button>. These navigate, so they must be
               * anchors: a <button> can't be middle-clicked into a new tab,
               * can't be copied as a link, and announces as "button" rather
               * than "link" to a screen reader. The classes are duplicated
               * from Button's token map on purpose — the alternative is an
               * `as` prop on Button, which is a bigger change than this
               * screen needs.
               *
               * ---- WHY "SIGN UP" ISN'T LIME ----
               *
               * It was, and the screenshot killed it. docs/03 allows exactly
               * ONE solid-lime action per screen, and a lime Sign up landed
               * ~80px above Discover's lime "+ Create" — two maximum-emphasis
               * buttons arguing on the same view.
               *
               * The deciding argument is that this bar is PERSISTENT. A lime
               * button here doesn't collide with one page's primary action, it
               * collides with every page's, forever. A shell element doesn't
               * get to spend a budget that belongs to whatever screen it's
               * floating above — so it takes the secondary treatment and the
               * page keeps its one lime.
               */
              <>
                <Link
                  to="/login"
                  className="inline-flex min-h-9 items-center rounded-control px-3 text-meta font-medium text-content-muted transition-colors hover:bg-raised hover:text-content"
                >
                  Log in
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex min-h-9 items-center rounded-control border border-border bg-raised px-3 text-meta font-medium text-content transition-colors hover:bg-hover"
                >
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="pb-24 lg:pb-8">
        {/* max-w-6xl stops lines running edge to edge on a wide monitor.
            Unbounded text on a 1440px screen is genuinely hard to read —
            the eye loses its place returning to the start of the next line. */}
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mounted ONCE, here at the root, so any component in any feature can
          fire a toast without rendering one itself. See shared/uiStore.ts. */}
      <ToastViewport />

      {/* ---------- BOTTOM TAB BAR (below lg) ---------- */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden"
      >
        {mobileNav.map((item) => {
          const IconComponent = item.icon

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                // min-h-14 keeps each tab comfortably above the 44px touch
                // minimum even with the label underneath.
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-label transition-colors ${
                  isActive ? 'text-primary' : 'text-content-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <IconComponent size={20} weight={isActive ? 'fill' : 'regular'} />
                  {/* Icon AND label. Icon-only navigation is guesswork for
                      anyone who doesn't already know the app — the skill's
                      `nav-label-icon` rule. */}
                  <span className="truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
