import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CaretDown, Gear, SignOut, User } from '@phosphor-icons/react'
import { Avatar } from './Avatar'

/**
 * The account menu: avatar trigger, popover of links underneath.
 *
 * Deliberately NOT role="menu". That role is a contract — it promises a screen
 * reader menu keyboard behaviour (trapped Tab, arrow navigation, roving
 * tabindex), and claiming it without implementing that is worse than not
 * claiming it. These are navigation links, so this is a plain popover of
 * <Link>s and the browser handles Tab and Enter correctly for free. Reach for
 * role="menu" when the items are commands acting on something.
 *
 * Three behaviours the browser does not supply, handled in the effect below:
 * Escape closes and returns focus to the trigger, an outside click closes, and
 * navigating closes.
 */

interface UserMenuProps {
  /** Shown in the panel header, and used for the avatar's initials. */
  name: string
  onLogout: () => void
}

/** Shared by every row, so their paddings cannot drift apart by a pixel. */
const rowClasses =
  'flex w-full items-center gap-3 px-3 py-2.5 text-meta transition-colors'

export function UserMenu({ name, onLogout }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  // containerRef wraps trigger and panel, for "was this click inside me?";
  // triggerRef is the button alone, for returning focus on Escape.
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const location = useLocation()

  /*
   * Close on navigation by adjusting state during render rather than in an
   * effect. An effect runs after paint, so there would be a frame showing the
   * new page with the old page's menu open on top of it, then a second render
   * to close it. Comparing to the last rendered path lets React discard the
   * in-progress output and re-run with the corrected state before anything
   * reaches the screen.
   *
   * It also catches navigations this component did not cause, such as Back.
   */
  const [renderedPath, setRenderedPath] = useState(location.pathname)

  if (renderedPath !== location.pathname) {
    setRenderedPath(location.pathname)
    setIsOpen(false)
  }

  useEffect(() => {
    // Bail before attaching: otherwise every closed menu on the page still
    // holds a document-level listener.
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      setIsOpen(false)
      // Return focus to the trigger, or a keyboard user is dumped at the top
      // of the document.
      triggerRef.current?.focus()
    }

    // pointerdown, not click: click fires on release, so pressing outside the
    // panel and dragging onto a link would close the menu mid-gesture and
    // swallow the click.
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

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
        // haspopup is "true", not "menu", matching what this actually is.
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`Account menu for ${name}`}
        // The open surface is separate from the hover one: without it, moving
        // the mouse away leaves the trigger looking untouched while its own
        // panel hangs off it.
        className={`flex items-center gap-2 rounded-pill p-1 pr-2 transition-colors hover:bg-raised ${
          isOpen ? 'bg-raised' : ''
        }`}
      >
        <Avatar name={name} colour="lime" size="sm" />
        <CaretDown
          size={14}
          aria-hidden="true"
          className={`text-content-muted transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          /*
           * origin-top-right is the load-bearing one: the default origin is the
           * element's centre, which makes the panel grow out of mid-air instead
           * of out of the button that opened it.
           *
           * starting:scale-95, not scale-0 — nothing expands from literally
           * zero, and 95% reads as "this was already here". `starting:` is
           * Tailwind's wrapper for -style, replacing the old dance of
           * mounting hidden and flipping a flag in an effect to trigger a
           * transition.
           *
           * No exit animation: the panel unmounts, so it is simply gone. Buying
           * a fade-out means keeping a dead panel mounted and tracking a third
           * state for 100ms nobody asked for.
           *
           * prefers-reduced-motion needs no branch here — the global rule in
           * index.css clamps every transition in the app.
           */
          className="absolute right-0 top-full z-40 mt-2 w-56 origin-top-right overflow-hidden rounded-card border border-border bg-surface shadow-lg transition-[opacity,transform] duration-150 ease-pop starting:scale-95 starting:opacity-0"
        >
          {/* On mobile the tab bar shows no identity at all, so this is the only
              place the signed-in name appears. */}
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

          {/* Fenced off and coloured with the danger token: it is the one item
              here that clicking again will not undo, sitting one row below two
              harmless links. */}
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
