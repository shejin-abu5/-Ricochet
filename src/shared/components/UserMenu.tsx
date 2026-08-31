import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CaretDown, Gear, SignOut, User } from '@phosphor-icons/react'
import { Avatar } from './Avatar'

/**
 * ============================================================
 *  THE ACCOUNT MENU — avatar in the top bar, links underneath
 * ============================================================
 *
 * When the sidebar went away, three things lost their home: Profile, Settings
 * and Log out. Putting all three back into the nav bar as visible links would
 * have made a six-item bar where only four items are places you actually GO.
 * So the account cluster collapses into one control: your avatar.
 *
 * ---- WHY THIS IS NOT role="menu" ----
 *
 * This looks like a dropdown menu, and the obvious instinct is to reach for
 * ARIA's menu pattern: role="menu" on the panel, role="menuitem" on each row.
 *
 * That pattern comes with a contract. Once you tell a screen reader "this is a
 * menu", the user expects MENU keyboard behaviour: Tab is trapped, arrow keys
 * move between items, Home/End jump to the ends, and only one item is in the
 * tab order at a time (a "roving tabindex"). Claiming the role without
 * implementing that behaviour is WORSE than not claiming it — the assistive
 * tech promises the user something the widget doesn't deliver.
 *
 * What this actually is: a popover containing three ordinary links. So that's
 * what it's built as. `Tab` walks through them, `Enter` follows one, and the
 * browser does all of it for free, correctly, with no roving tabindex to get
 * subtly wrong.
 *
 * The rule of thumb worth keeping: reach for role="menu" when the items are
 * COMMANDS acting on something (like a right-click menu). When the items are
 * NAVIGATION — links to pages — a plain popover of <Link>s is both simpler and
 * more honest.
 *
 * ---- WHAT WE STILL HAVE TO IMPLEMENT BY HAND ----
 *
 * Three behaviours the browser won't give us, all in the effect below:
 *
 *   1. Escape closes it — and returns focus to the avatar. Closing without
 *      moving focus back would dump a keyboard user at the top of the document.
 *   2. Clicking outside closes it.
 *   3. Navigating closes it. Without this the panel would hang open over the
 *      page you just moved to.
 */

interface UserMenuProps {
  /** Shown in the panel header, and used for the avatar's initials. */
  name: string
  onLogout: () => void
}

/**
 * One row in the panel. Defined here rather than inline because all four rows
 * (three links plus the log-out button) must share exactly one set of paddings
 * — if they drift apart by 2px the panel looks hand-assembled.
 */
const rowClasses =
  'flex w-full items-center gap-3 px-3 py-2.5 text-meta transition-colors'

export function UserMenu({ name, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  /**
   * Two refs with two different jobs, which is why they aren't one ref:
   *
   *   containerRef  wraps BOTH trigger and panel — "is this click inside me?"
   *   triggerRef    the button alone — "put focus back HERE on Escape"
   */
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const location = useLocation()

  /**
   * ---- CLOSE ON NAVIGATION, WITHOUT AN EFFECT ----
   *
   * The obvious way to write this is an effect that watches the path:
   *
   *   useEffect(() => { setIsOpen(false) }, [location.pathname])   // don't
   *
   * It works, and the linter rejects it, correctly. An effect runs AFTER React
   * has painted — so there is a frame where the new page is on screen with the
   * old page's menu still open on top of it, and then a second render to close
   * it. Effects are for synchronising with things OUTSIDE React (the address
   * bar, a socket, localStorage). The router's location is not outside React;
   * it's a value we're already rendering from.
   *
   * This is React's documented "adjusting state when a prop changes" pattern:
   * compare the current value to the one we last saw, and if it moved, fix
   * state DURING render. React notices the setState, throws away the output it
   * was midway through producing, and immediately re-runs this component with
   * the corrected state — all before anything reaches the screen. No wasted
   * paint, no flash of a stale menu.
   *
   * It also catches navigations we didn't cause: the browser Back button moves
   * the path without any click of ours, and this still closes the panel.
   *
   * The rule this follows: prefer deriving state during render; reach for an
   * effect only when something genuinely external has to be kept in step.
   */
  const [renderedPath, setRenderedPath] = useState(location.pathname)

  if (renderedPath !== location.pathname) {
    setRenderedPath(location.pathname)
    setIsOpen(false)
  }

  useEffect(() => {
    // Nothing to listen for while closed. Bailing early here isn't a
    // micro-optimisation — it's what keeps a document-level listener from
    // existing for every closed menu on the page.
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      // Focus goes back to what opened the menu. Skipping this is the most
      // common bug in hand-rolled dropdowns.
      triggerRef.current?.focus()
    }

    /**
     * `pointerdown`, not `click`. A click fires on RELEASE, so with `click` you
     * can press the mouse down outside the panel, drag onto a link and release
     * — and the menu closes on the way, swallowing your own click. pointerdown
     * fires on PRESS, which is the moment the user actually left the panel.
     */
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup runs when isOpen flips back to false OR the component unmounts.
    // Without it every open/close cycle would leave a listener behind.
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        /**
         * `aria-expanded` is the whole accessibility story of a disclosure
         * control: it tells a screen reader whether the thing this button
         * controls is currently showing. It must track state, not be hardcoded.
         *
         * `aria-haspopup="true"` (rather than "menu") matches what we actually
         * built — a popover, not an ARIA menu. See the note at the top.
         */
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Account menu for ${name}`}
        /**
         * The `isOpen` background is not the same thing as the hover one.
         *
         * Without it, opening the menu and then moving the mouse away leaves
         * the trigger looking untouched while a panel hangs off it — the
         * control and its own popover disagree about whether anything is
         * happening. An open disclosure keeps its active surface until it
         * closes (the `state-clarity` rule).
         */
        className={`flex items-center gap-2 rounded-pill p-1 pr-2 transition-colors hover:bg-raised ${
          isOpen ? 'bg-raised' : ''
        }`}
      >
        <Avatar name={name} colour="lime" size="sm" />
        <CaretDown
          size={14}
          aria-hidden="true"
          /**
           * The caret rotates to point at the open panel. It's 150ms of
           * transform — no layout, no repaint of anything around it.
           *
           * This is the cheapest possible "the button understood you" signal,
           * and it costs one class.
           */
          className={`text-content-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          /**
           * ---- THE MOTION, AND WHY THESE EXACT VALUES ----
           *
           * `origin-top-right` is the one that matters most. The default
           * transform-origin is the element's CENTRE, which makes a panel grow
           * outward from its own middle — as if it materialised in mid-air.
           * Anchoring the origin to the corner nearest the avatar makes it
           * grow OUT OF the button that opened it. Almost nobody notices this
           * consciously. Everybody notices when it's wrong.
           *
           * `starting:scale-95`, not `scale-0`. Nothing in the physical world
           * expands from literally zero size; starting at 95% reads as "this
           * was already here, it just arrived", which is what a popover is.
           *
           * `starting:` is Tailwind v4's wrapper for the CSS @starting-style
           * rule — the values an element animates FROM on its first frame in
           * the DOM. Before this existed, the React workaround was to mount the
           * element hidden, then flip a `mounted` flag in a useEffect purely to
           * trigger a transition. This is that whole dance, in two classes.
           *
           * `ease-pop` is our token (src/index.css) — a stronger ease-out than
           * the CSS default. 150ms sits in the 125-200ms band that popovers
           * want: quick enough not to be waited on, slow enough to be seen.
           *
           * There is deliberately no EXIT animation. The panel unmounts, so
           * it's simply gone. Exits should be faster than entrances anyway, and
           * an instant exit is as fast as it gets — buying a fade-out here
           * means keeping a dead panel mounted and tracking a third state,
           * which is a lot of machinery for 100ms nobody asked for.
           *
           * prefers-reduced-motion needs no branch: the global rule in
           * src/index.css already clamps every transition in the app to 0.01ms.
           */
          className="absolute right-0 top-full z-40 mt-2 w-56 origin-top-right overflow-hidden rounded-card border border-border bg-surface shadow-lg transition-[opacity,transform] duration-150 ease-pop starting:scale-95 starting:opacity-0"
        >
          {/* Whose account this is. On mobile especially — where the bottom
              tab bar shows no identity at all — this is the only place the
              signed-in name appears. */}
          <div className="border-b border-border px-3 py-3">
            <p className="truncate text-meta font-medium text-content">{name}</p>
            <p className="truncate text-label text-content-faint">Signed in</p>
          </div>

          <div className="py-1">
            <Link to="/profile" className={`${rowClasses} text-content-muted hover:bg-raised hover:text-content`}>
              <User size={18} aria-hidden="true" />
              Profile
            </Link>
            <Link to="/settings" className={`${rowClasses} text-content-muted hover:bg-raised hover:text-content`}>
              <Gear size={18} aria-hidden="true" />
              Settings
            </Link>
          </div>

          {/**
           * Log out is fenced off by a real border and coloured with the
           * danger token.
           *
           * Not decoration: it is the one item here you cannot undo by
           * clicking again, and it sits one row below two harmless links.
           * Distance plus colour is what stops a mis-aimed click from ending
           * someone's session (the `destructive-nav-separation` rule).
           */}
          <div className="border-t border-border py-1">
            <button
              type="button"
              onClick={onLogout}
              className={`${rowClasses} text-danger hover:bg-danger-surface`}
            >
              <SignOut size={18} aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
