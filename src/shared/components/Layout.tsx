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
 * The app shell: top bar on desktop, bottom tab bar below lg.
 *
 * A sidebar was tried first and removed. A sidebar suits many destinations;
 * Ricochet has four, which left ~500px of empty column on every screen. Four
 * links fit one horizontal row that costs 64px of height once rather than 240px
 * of width permanently.
 *
 * Below lg the nav stays under the thumb as bottom tabs and the top bar shrinks
 * to logo plus account — which is also what fixed the old bug where log out
 * lived in the lg-only sidebar and was unreachable on a phone.
 */

interface NavItem {
  to: string
  label: string
  icon: Icon
  /**
   * Per-icon hover animation for the desktop bar — the house hops, the trophy
   * tilts. On the data rather than in TopNavLink because each one differs.
   * Keyframes are in src/index.css.
   *
   * Full class strings, never interpolated: Tailwind scans source as plain text
   * and a name built at runtime compiles to no CSS at all.
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
 * Account destinations. Drawn by <UserMenu> on desktop, but the mobile tab bar
 * still reads Profile from here so both navs share one source.
 */
const accountNav: NavItem[] = [
  { to: '/profile', label: 'Profile', icon: User },
  { to: '/settings', label: 'Settings', icon: Gear, hideOnMobile: true },
]

/**
 * One link in the desktop top bar.
 *
 * The active state is colour plus icon weight rather than an underline:
 * Phosphor switches outline to filled via `weight`, so the current item differs
 * in glyph shape as well as colour. That reads for a colourblind user, matches
 * the bottom tab bar, and is a stronger signal than a 2px rule.
 *
 * `group` is on the link, not the icon, so hovering the word "Tournaments"
 * tilts the trophy.
 */
function TopNavLink({ item }: { item: NavItem }) {
  const IconComponent = item.icon

  return (
    <NavLink
      to={item.to}
      // Without `end`, "/" matches every route and Home reads as active
      // everywhere.
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
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const navigate = useNavigate()

  // Clears the session AND the query cache. Without the second, the next
  // person to log in on this device briefly sees the previous user's teams and
  // invites.
  const handleLogout = () => {
    logout()
    queryClient.clear()
    navigate('/login')
  }

  const mobileNav = [...primaryNav, ...accountNav].filter((item) => !item.hideOnMobile)

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Invisible until focused, then the first thing a keyboard user reaches
          — it saves tabbing the whole bar on every page load. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-primary focus:px-4 focus:py-2 focus:text-meta focus:text-on-primary"
      >
        Skip to content
      </a>

      {/* sticky, not fixed: it stays in flow, so content below starts beneath
          it with no manual top padding to keep in sync when the bar's height
          changes. The bottom tab bar IS fixed, which is why <main> carries an
          explicit pb-24 to clear it. */}
      <header className="sticky top-0 z-30 border-b border-border bg-canvas/80 backdrop-blur">
        {/* Two widths doing two jobs: the <header> is full-bleed so its border
            runs the viewport, while this row reuses the exact container every
            page uses (max-w-6xl, px-4 lg:px-6). That puts the logo on the same
            vertical line as each page's <h1> and the account cluster on the
            same line as its "+ Create" — which is most of what stops a top bar
            reading as chrome bolted on above the page.

            The row needs ~1030px for logo, search, four links and the account
            cluster; the search field carries max-w-72 and shrinks first, so the
            squeeze lands on the element that degrades gracefully.

            h-19 (76px) at lg rather than 64px is what lets a 44px search pill
            sit inside with real breathing room. Mobile stays at h-16, where
            vertical space is scarcer and the bar holds less. */}
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 lg:h-19 lg:gap-6 lg:px-6">
          <Link
            to="/"
            className="shrink-0 rounded-control text-xl font-bold text-primary"
            aria-label="Ricochet — home"
          >
            Ricochet
          </Link>

          {/* Hidden below sm: at 375px, sharing a 64px row with the logo and
              avatar leaves ~90px of input, which is not usable. Discover's own
              search is a tap away there. */}
          <GlobalSearch className="hidden w-full max-w-72 sm:block" />

          {/* mx-auto centres the nav in whatever space the logo, search and
              account cluster leave, and stays centred as those change width. */}
          <nav aria-label="Main" className="mx-auto hidden items-center gap-1 lg:flex">
            {primaryNav.map((item) => (
              <TopNavLink key={item.to} item={item} />
            ))}
          </nav>

          {/* ml-auto pins this right while the nav is hidden; at lg the nav's own
              mx-auto already does it, so the margin is dropped to keep that
              centring honest. */}
          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            {user ? (
              <UserMenu name={user.name} onLogout={handleLogout} />
            ) : (
              /*
               * Anchors, not <Button>, because these navigate: a <button>
               * cannot be middle-clicked into a new tab or copied as a link,
               * and announces as "button" rather than "link". The classes
               * duplicate Button's token map deliberately — the alternative is
               * an `as` prop on Button, a bigger change than this needs.
               *
               * Sign up is not lime. docs/03 allows one solid-lime action per
               * screen, and this bar is persistent — a lime button here does
               * not collide with one page's primary action, it collides with
               * every page's. The shell takes the secondary treatment and the
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
        <div className="mx-auto max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mounted once at the root so any feature can fire a toast without
          rendering one itself. */}
      <ToastViewport />

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
                // min-h-14 clears the 44px touch minimum with the label below.
                `flex min-h-14 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-label transition-colors ${
                  isActive ? 'text-primary' : 'text-content-muted'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <IconComponent size={20} weight={isActive ? 'fill' : 'regular'} />
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
