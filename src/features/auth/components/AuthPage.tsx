import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { AuthSplitLayout } from './AuthSplitLayout'

/**
 * ============================================================
 *  ONE AUTH PAGE, TWO URLS
 * ============================================================
 *
 * Log in and sign up are the same screen. Switching between them fades the
 * left column and leaves the gradient panel completely untouched.
 *
 * ---- WHY THIS ISN'T ONE ROUTE WITH A useState TOGGLE ----
 *
 * The obvious way to build "one page" is a single /auth route holding a
 * `const [mode, setMode] = useState('login')`. It works, and it throws away
 * things that are genuinely load-bearing:
 *
 *   - Layout.tsx runs `navigate('/login')` on logout. That URL has to exist.
 *   - "Create an account" links — from a marketing page, an email, anywhere
 *     off-site — need somewhere to point.
 *   - The back button should undo the switch, and it can't undo useState.
 *
 * ---- HOW BOTH THINGS ARE TRUE AT ONCE ----
 *
 * This component is mounted by a PATHLESS layout route in router.tsx: a route
 * with an `element` but no `path`. Its children carry the paths:
 *
 *   { element: <AuthPage />, children: [
 *       { path: '/login',  element: <LoginForm />  },
 *       { path: '/signup', element: <SignupForm /> },
 *   ]}
 *
 * Because the LAYOUT route is what matched (and it matches both URLs), React
 * Router keeps this component mounted across the navigation and swaps only
 * what's inside <Outlet />. So the gradient panel isn't re-rendered, isn't
 * re-created, and the browser never re-decodes the SVG — it is genuinely the
 * same DOM node before and after.
 *
 * Two page-level routes each rendering their own copy of the shell would tear
 * it down and rebuild it on every switch, which is exactly the flash we're
 * avoiding.
 */

/** The two halves of the switch. One array so the pair can never drift. */
const MODES = [
  { to: '/login', label: 'Log in' },
  { to: '/signup', label: 'Sign up' },
] as const

interface ModeCopy {
  title: string
  subtitle: string
}

/**
 * Heading and subtitle per URL.
 *
 * A lookup rather than a ternary because there are two things that vary
 * together — a ternary would need repeating for each of them, and that's how
 * you end up with the sign-up title above the log-in subtitle.
 */
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
  // Re-runs on every navigation, which is what drives both the copy swap and
  // the animation restart below.
  const { pathname } = useLocation()

  // Falls back rather than crashing. Only /login and /signup can reach this
  // component today, but a lookup that can return undefined should say what it
  // does when it has to — not throw on a URL somebody adds next month.
  const copy = COPY[pathname] ?? COPY['/login']

  return (
    <AuthSplitLayout
      toggle={
        /**
         * LINKS, NOT BUTTONS.
         *
         * This changes the URL, so it's navigation — which means it should be
         * <a href> underneath. That's not pedantry: it's what makes
         * ctrl-click, middle-click, "open in new tab" and the browser's own
         * focus handling work. A <button onClick={navigate}> silently loses
         * all four.
         */
        <nav aria-label="Log in or sign up" className="flex gap-1 rounded-pill bg-raised p-1">
          {MODES.map((mode) => (
            <NavLink
              key={mode.to}
              to={mode.to}
              className={({ isActive }) =>
                // min-h-9 keeps each half a comfortable target; the pair sits
                // well clear of the 44px minimum once the p-1 padding is in.
                `flex min-h-9 flex-1 items-center justify-center rounded-pill px-4 text-meta transition-colors ${
                  isActive
                    ? // Active state carries a FILL and a COLOUR change, not
                      // colour alone — the same two-signal pattern the sidebar
                      // uses, so the app only has one "this one is selected"
                      // vocabulary.
                      //
                      // A TINT rather than solid lime, deliberately: the submit
                      // button below is already the screen's one solid-lime
                      // action, and docs/13 allows exactly one of those.
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
      {/**
       * `key={pathname}` is the entire animation.
       *
       * Changing a key tells React "this is a different element" — so it drops
       * the old node and mounts a fresh one, and a brand-new DOM node runs its
       * CSS animation from the start. Without the key React would reuse the
       * same div, the animation would already be finished, and nothing would
       * move.
       *
       * ---- WHY FADE-IN RATHER THAN A TRUE CROSSFADE ----
       *
       * A crossfade needs both forms in the DOM at once, and that has a real
       * cost here: the sign-up form's `autocomplete="new-password"` sitting
       * beside the log-in form's `autocomplete="current-password"` reliably
       * confuses password managers into offering the wrong thing.
       *
       * It also removes a layout problem for free. Sign up has four fields and
       * log in has two, so two stacked forms would either need the container
       * frozen at the taller one — leaving dead space under the log-in form —
       * or an animated height. One form at a time has neither problem.
       */}
      <div key={pathname} className="animate-form-in">
        <h1 className="text-display text-content">{copy.title}</h1>
        <p className="mt-2 text-meta text-content-muted">{copy.subtitle}</p>

        {/* The matched child route: <LoginForm /> or <SignupForm />. */}
        <div className="mt-7">
          <Outlet />
        </div>
      </div>
    </AuthSplitLayout>
  )
}
