import { useDeferredValue, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus } from '@phosphor-icons/react'
import { MatchFilters } from './MatchFilters'
import { MatchList } from './MatchList'
import { useMatches } from '../api/useMatches'
import type { MatchFilters as Filters, MatchFormat } from '../types'

/**
 * Discover. Filters live in the URL (/?format=5v5&q=turf) rather than local
 * state, which makes filtered views shareable, survives a refresh, and lets the
 * back button step through filter changes.
 */
export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // `?? undefined` because get() returns null for an absent param and Filters
  // spells "not set" as undefined.
  //
  // The casts assert shapes TypeScript can't verify — the URL is user-editable,
  // so ?show=banana type-checks. Tolerable only because nothing on the client
  // trusts these: they go straight to the server, which ignores what it doesn't
  // recognise. Indexing an object or picking a component with one would need a
  // real runtime guard instead.
  const filters: Filters = {
    format: (searchParams.get('format') as MatchFormat | null) ?? undefined,
    date: (searchParams.get('date') as 'today' | 'week' | null) ?? undefined,
    q: searchParams.get('q') ?? undefined,
    show: (searchParams.get('show') as 'available' | 'night' | null) ?? undefined,
  }

  // The search box is the one filter held locally: writing the URL per keystroke
  // would push a history entry per letter. It syncs to the URL on a delay below.
  const [searchValue, setSearchValue] = useState(filters.q ?? '')

  /**
   * The URL can also change from outside this component — the header's
   * GlobalSearch navigates to /?q=turf without remounting Discover. Left alone,
   * the effect below would then see a stale empty input and delete `q` again,
   * so the header's search silently did nothing.
   *
   * Adjusting during render (rather than in an effect) means the corrected
   * value is on screen in the same paint, with no frame showing the stale one.
   */
  const urlQuery = filters.q ?? ''
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery)

  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery)
    setSearchValue(urlQuery)
  }

  // The input reads `searchValue` so typing stays instant; the request keys off
  // the deferred copy, so it doesn't fire once per keystroke.
  const deferredSearch = useDeferredValue(searchValue)

  useEffect(() => {
    const trimmed = deferredSearch.trim()
    const current = searchParams.get('q') ?? ''

    // Without this guard the write re-renders, which re-runs the effect, which
    // writes again.
    if (trimmed === current) return

    const next = new URLSearchParams(searchParams)
    if (trimmed) {
      next.set('q', trimmed)
    } else {
      next.delete('q')
    }

    // replace so typing a query doesn't flood the back button.
    setSearchParams(next, { replace: true })
  }, [deferredSearch, searchParams, setSearchParams])

  const handleFilterChange = (nextFilters: Filters) => {
    const next = new URLSearchParams(searchParams)

    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) {
        next.set(key, value)
      } else {
        // Delete rather than set '' — otherwise the URL collects ?date=&q=
        next.delete(key)
      }
    }

    setSearchParams(next)
  }

  const handleClearFilters = () => {
    setSearchValue('')
    setSearchParams(new URLSearchParams())
  }

  const { data, isPending, isError, isFetching, refetch } = useMatches(filters)

  /**
   * Drives the empty state's "clear filters" button, so it has to name every
   * filter — miss one and the empty list offers no way out of the filter that
   * emptied it. Twin of `noFilters` in MatchFilters.tsx.
   *
   * Object.values(...).some(Boolean) would never go stale but would also count
   * any future non-filter field, so the explicit list stays: it breaks loudly.
   */
  const hasFilters = Boolean(filters.format || filters.date || filters.q || filters.show)

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-content">Discover Matches</h1>
          <p className="mt-1 text-meta text-content-muted">
            Find pickup games, team fixtures, and tournaments near you
          </p>
        </div>

        {/* Hidden on the smallest screens, where it would crowd the header —
            the thumb-reachable copy at the bottom takes over there. */}
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
