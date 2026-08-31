import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'

/**
 * ============================================================
 *  GLOBAL SEARCH — the header's pill, modelled on Playo's
 * ============================================================
 *
 * ---- THIS IS NOT THE OLD SEARCH BAR COMING BACK ----
 *
 * The shell used to have a search input that was literally `disabled` and
 * wired to nothing (see docs/18-top-nav-notes.md). It was deleted for that
 * reason, and putting a second dead input back would be the same mistake in a
 * nicer shape.
 *
 * So this one WORKS. It has one job, and does it end to end: submit takes you
 * to Discover with the query applied.
 *
 * ---- HOW IT WORKS WITHOUT ANY STATE PLUMBING ----
 *
 * DiscoverPage already reads its filters from the URL — `/?q=turf` renders the
 * matches whose title or location contains "turf". That was built for
 * shareable links, and it means this component doesn't need a store, a
 * context, or a prop drilled down from anywhere. It just navigates:
 *
 *     navigate('/?q=turf')
 *
 * ...and Discover does the rest. This is the payoff for having put filter
 * state in the URL instead of useState: a completely unrelated component in a
 * completely different part of the tree can drive it, with one line and no
 * shared state at all.
 *
 * ---- WHY THE PLACEHOLDER SAYS "MATCHES" AND NOT MORE ----
 *
 * The old one promised "Search matches, teams, or players…". It searched
 * nothing. This one searches matches, so it says matches. An input that names
 * more than it delivers is a bug report waiting to happen — when teams and
 * players are searchable, the placeholder grows then.
 *
 * ---- WHY LOCAL useState AND NOT THE URL ----
 *
 * Same reasoning as DiscoverPage's own input: writing to the URL on every
 * keystroke would push a history entry per letter, so Back would walk you
 * through "tur", "tu", "t". The URL is written once, on submit.
 */

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className = '' }: GlobalSearchProps) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event: React.FormEvent) => {
    // Without this the browser does a full page reload on Enter — which in an
    // SPA throws away the whole React tree and every cached query.
    event.preventDefault()

    const query = value.trim()
    // Empty submit clears rather than navigating to `?q=` with nothing in it.
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
  }

  return (
    /**
     * A real <form>, not an input with an onKeyDown looking for "Enter".
     *
     * The form gives us Enter-to-submit for free, and `role="search"` makes
     * this a landmark — screen-reader users can jump straight to it the same
     * way they can jump to <nav>.
     */
    <form role="search" onSubmit={handleSubmit} className={className}>
      <label className="relative flex items-center">
        {/* The icon is the visual label; screen readers need a real one. */}
        <span className="sr-only">Search matches</span>

        <MagnifyingGlass
          size={18}
          aria-hidden="true"
          // pointer-events-none so clicking the icon focuses the input
          // underneath it instead of hitting a dead glyph.
          className="pointer-events-none absolute left-4 text-content-faint"
        />

        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search matches"
          /**
           * min-h-11 = 44px, the touch-target floor. text-meta is 14px — note
           * that on iOS an input under 16px makes Safari zoom the page on
           * focus, but this input is hidden below `sm`, and at those widths a
           * pointer is doing the focusing.
           *
           * rounded-pill + bg-raised matches the reference's pill, and reuses
           * the same surface token every other control on a dark ground uses.
           */
          className="min-h-11 w-full rounded-pill border border-border bg-raised pl-11 pr-4 text-meta text-content transition-colors placeholder:text-content-faint hover:border-border-strong focus:border-border-strong"
        />
      </label>
    </form>
  )
}
