import { useDeferredValue, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from '@phosphor-icons/react'
import { MatchFilters } from './MatchFilters'
import { MatchList } from './MatchList'
import { useMatches } from '../api/useMatches'
import type { MatchFilters as Filters, MatchFormat } from '../types'

/**
 * ============================================================
 *  THE URL IS THE STATE CONTAINER
 * ============================================================
 *
 * Filters live in the address bar: /?format=5v5&q=turf
 *
 * We could have used useState. Putting them in the URL instead buys three
 * things for free, with no extra code:
 *
 *   1. The back button steps through filter changes, like users expect.
 *   2. A filtered view is a shareable link — send someone "5v5 matches
 *      this week" and they see exactly what you see.
 *   3. Refreshing the page keeps your filters.
 *
 * useSearchParams is React Router's hook for this. It works like useState:
 * you get the current value and a setter, and changing it re-renders.
 * The difference is that the value lives in the URL, not in memory.
 */
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Read the URL into a plain object our query layer understands.
  // `?? undefined` because searchParams.get() returns null when a param is
  // absent, and our MatchFilters type expects undefined for "not set".
  const filters: Filters = {
    format: (searchParams.get('format') as MatchFormat | null) ?? undefined,
    date: (searchParams.get('date') as 'today' | 'week' | null) ?? undefined,
    q: searchParams.get('q') ?? undefined,
  }

  /**
   * SEARCH INPUT: local state, not the URL.
   *
   * Why the exception? Writing to the URL on every keystroke would push a
   * history entry per letter — the back button would then walk backwards
   * through "tur", "tu", "t". So the input is local, and we sync it to the
   * URL after a short pause (see the useEffect below).
   */
  const [searchValue, setSearchValue] = useState(filters.q ?? '')

  /**
   * ---- ...BUT THE URL CAN ALSO CHANGE WITHOUT US ----
   *
   * `useState(filters.q)` reads the URL exactly ONCE, when this component
   * first mounts. That was fine while this input was the only thing that
   * could set `?q=`. It isn't any more: the header's <GlobalSearch> navigates
   * to `/?q=turf` from anywhere in the app.
   *
   * When that happened while Discover was already mounted, the two searches
   * fought and the header lost:
   *
   *   1. header navigates    → URL is `/?q=turf`
   *   2. Discover does NOT remount (same route), so searchValue is still ''
   *   3. the effect below wakes up, sees '' !== 'turf'...
   *   4. ...and deletes q from the URL. The search silently did nothing.
   *
   * The fix is to let the URL win, since the URL is the source of truth here.
   * This is the same "adjust state during render" pattern UserMenu uses to
   * close on navigation: compare what we last saw to what's there now, and if
   * something else moved it, follow.
   *
   * It runs during render rather than in an effect, so the corrected value is
   * on screen in the same paint — no frame showing a stale input.
   */
  const urlQuery = filters.q ?? ''
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery)

  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery)
    setSearchValue(urlQuery)
  }

  /**
   * useDeferredValue (React 19) hands back a "lagging" copy of a value.
   * The input stays perfectly responsive because `searchValue` updates
   * immediately, while `deferredSearch` trails slightly behind — and it's
   * the deferred one we use for the expensive work (a network request).
   *
   * Result: typing feels instant, but we don't fire a request per keystroke.
   */
  const deferredSearch = useDeferredValue(searchValue)

  /**
   * Sync the deferred search value into the URL.
   *
   * useEffect = "run this AFTER rendering, when these values changed".
   * We need it here because we're synchronising with something OUTSIDE
   * React (the browser's address bar) — that's exactly what effects are for.
   */
  useEffect(() => {
    const trimmed = deferredSearch.trim()
    const current = searchParams.get('q') ?? ''

    // Guard: without this, setting the params would re-render, which would
    // run this effect again, forever. Only write when something CHANGED.
    if (trimmed === current) return

    const next = new URLSearchParams(searchParams)
    if (trimmed) {
      next.set('q', trimmed)
    } else {
      next.delete('q')
    }

    // replace: true overwrites the current history entry instead of adding
    // one, so searching doesn't flood the back button.
    setSearchParams(next, { replace: true })
  }, [deferredSearch, searchParams, setSearchParams]) // [] is the dependency array. The watch list.

  /** Write chip selections into the URL. */
  const handleFilterChange = (nextFilters: Filters) => {
    const next = new URLSearchParams(searchParams)

    // Object.entries turns { format: '5v5', date: undefined } into
    // [['format','5v5'], ['date', undefined]] so we can loop over it.
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) {
        next.set(key, value)
      } else {
        // Deleting rather than setting "" keeps the URL clean: /?format=5v5
        // instead of /?format=5v5&date=&q=
        next.delete(key)
      }
    }

    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setSearchValue('')
    setSearchParams(new URLSearchParams())
  }

  /**
   * THE HOOK. Note what's passed: `filters`, read from the URL. So the URL
   * drives the query key, which drives the cache. Change the URL → new key
   * → Query either serves a cached result instantly or fetches a new one.
   */
  const { data, isPending, isError, isFetching, refetch } = useMatches(filters)

  const hasFilters = Boolean(filters.format || filters.date || filters.q)

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-content">Discover Matches</h1>
          <p className="mt-1 text-meta text-content-muted">
            Find pickup games, team fixtures, and tournaments near you
          </p>
        </div>

        {/* Lime fill, dark text — `text-on-primary`, never white. Hidden on
            the smallest screens where the header would crowd; the create
            action is still reachable from the empty state and the nav. */}
        <Link
          to="/matches/new"
          className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-control bg-primary px-4 text-meta font-medium text-on-primary transition-colors hover:bg-primary-hover sm:inline-flex"
        >
          <Plus size={16} weight="bold" />
          Create
        </Link>
      </div>

      <MatchFilters
        filters={filters}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onFilterChange={handleFilterChange}
      />

      <section className="flex flex-col gap-3">
        {/* A real heading, not a styled <p>. Screen-reader users navigate by
            heading; skipping levels or faking them with paragraphs removes
            the page's structure for anyone not looking at it. */}
        <h2 className="text-heading text-content">Nearby Matches</h2>

        <MatchList
          matches={data}
          isPending={isPending}
          isError={isError}
          isFetching={isFetching}
          onRetry={refetch}
          onClearFilters={handleClearFilters}
          hasFilters={hasFilters}
        />
      </section>

      {/* Mobile create button: full width at the bottom of the content, where
          a thumb can reach it, instead of the header. */}
      <Link
        to="/matches/new"
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-primary px-4 text-meta font-medium text-on-primary sm:hidden"
      >
        <Plus size={16} weight="bold" />
        Create a match
      </Link>
    </div>
  )
}
