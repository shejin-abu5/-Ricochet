import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthSplitLayout } from './AuthSplitLayout'

/**
 * Shared shell for /login and /signup.
 *
 * Both URLs are real routes rather than one route with a mode toggle, because
 * logout navigates to /login, off-site links point at /signup, and the back
 * button has to undo the switch — none of which a useState toggle gives you.
 *
 * router.tsx mounts this as a PATHLESS layout route with /login and /signup as
 * children, so the layout route stays matched across the navigation and React
 * Router swaps only the <Outlet />. Two sibling page routes would tear the
 * brand panel down and rebuild it on every switch.
 */

const MODES = [
  { to: '/login', label: 'Log in' },
  { to: '/signup', label: 'Sign up' },
] as const

interface ModeCopy {
  title: string
  subtitle: string
}

// A lookup rather than a ternary: title and subtitle vary together, and a
// ternary per field is how a sign-up title ends up over a log-in subtitle.
const COPY: Record<string, ModeCopy> = {
  '/login': {
    title: 'Welcome back',
    subtitle: 'Log in to see what games are on this week.',
  },
  '/signup': {
    title: 'Create your account',
    subtitle: 'Free, and takes about a minute.',
  },
}

export function AuthPage() {
  const { pathname } = useLocation()

  const copy = COPY[pathname] ?? COPY['/login']

  return (
    <AuthSplitLayout
      toggle={
        // Links rather than buttons: this changes the URL, so ctrl-click,
        // middle-click and "open in new tab" should all work.
        <nav aria-label="Log in or sign up" className="flex gap-1 rounded-pill bg-raised p-1">
          {MODES.map((mode) => (
            <NavLink
              key={mode.to}
              to={mode.to}
              className={({ isActive }) =>
                `flex min-h-9 flex-1 items-center justify-center rounded-pill px-4 text-meta transition-colors ${
                  isActive
                    ? // Fill plus colour, matching the sidebar's selected state so
                      // the app has one "this one is active" vocabulary. Tinted
                      // rather than solid lime — the submit button below is this
                      // screen's one solid-lime action (docs/13).
                      'bg-primary/10 font-medium text-primary'
                    : 'text-content-muted hover:text-content'
                }`
              }
            >
              {mode.label}
            </NavLink>
          ))}
        </nav>
      }
    >
      {/* key={pathname} remounts this block on navigation so its CSS entry
          animation replays. A crossfade was rejected: both forms in the DOM at
          once puts new-password and current-password inputs side by side, which
          reliably confuses password managers. */}
      <div key={pathname} className="animate-form-in">
        <h1 className="text-display text-content">{copy.title}</h1>
        <p className="mt-2 text-meta text-content-muted">{copy.subtitle}</p>

        <div className="mt-7">
          <Outlet />
        </div>
      </div>
    </AuthSplitLayout>
  )
}
