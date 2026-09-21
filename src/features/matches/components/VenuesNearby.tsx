import { Link } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useMatches } from '../api/useMatches'
import venuePlaceholder from '../../../assets/venue-placeholder.svg'

/** Four is enough to be useful in a sidebar and short enough not to scroll. */
const MAX_VENUES = 4

/**
 * "Venues nearby" — other places with games coming up.
 *
 * There is no Venue entity: `Match.location` is free text, and a real venue
 * directory is backlog item #11 in docs/14. So this derives from what exists —
 * group upcoming matches by location string, drop the current one, rank by
 * count. "Nearby" is aspirational; with no coordinates this is really "other
 * active venues", which reads as nearby only because the seed data is one city.
 *
 * Every row shares one imported placeholder image, so it costs a single request
 * however many rows render. When venues carry real photos the change is
 * `venue.imageUrl ?? venuePlaceholder` and nothing else in this file moves.
 *
 * useMatches({}) shares DiscoverPage's unfiltered cache entry rather than
 * fetching again: Query hashes keys with JSON.stringify, which drops the
 * undefined values Discover passes, so both serialise identically.
 */
export function VenuesNearby({ currentLocation }: { currentLocation: string }) {
  // Empty filters = every upcoming match.
  const { data: matches, isPending } = useMatches({})

  if (isPending) {
    return (
      <section aria-busy="true" className="rounded-card border border-border bg-surface p-5">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            // Mirrors the real row, thumbnail included — a text-only skeleton
            // would let the images pop in and shove every row taller.
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-control" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // A Map, not an object: locations are arbitrary user-entered strings, and a
  // venue named "constructor" would collide with Object.prototype.
  const countByVenue = new Map<string, number>()
  for (const match of matches ?? []) {
    if (match.location === currentLocation) continue
    countByVenue.set(match.location, (countByVenue.get(match.location) ?? 0) + 1)
  }

  const venues = [...countByVenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_VENUES)

  // Drop the whole card rather than leave a headed empty box in the sidebar.
  if (venues.length === 0) return null

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-heading text-content">Venues nearby</h2>
      <p className="mt-1 text-meta text-content-muted">Other places with games coming up.</p>

      <ul className="mt-4 flex flex-col">
        {venues.map(([location, count]) => (
          <li key={location}>
            {/* Reuses the existing `q` filter, which already searches location —
                no new endpoint, and the result is shareable because the query
                lives in the URL.

                -mx-2 with px-2 lets the hover highlight bleed past the card's
                text alignment, so the row is a full-width target while the text
                stays aligned with the heading. */}
            <Link
              to={`/?q=${encodeURIComponent(location)}`}
              className="-mx-2 flex min-h-11 items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-raised"
            >
              {/* alt="" is deliberate, not missing: the venue name is already
                  beside it, so the image is decorative.

                  The border stops the thumbnail dissolving into the row on
                  hover, since its fill and the hover colour are both bg-raised.
                  width/height reserve the space before the file loads, and
                  object-cover is for the day these are real photos of assorted
                  shapes. */}
              <img
                src={venuePlaceholder}
                alt=""
                width={40}
                height={40}
                // bg-raised is load-bearing: the artwork's own background rect
                // was removed so the SVG stays usable at any size, leaving it
                // transparent.
                className="h-10 w-10 shrink-0 rounded-control border border-border bg-raised object-cover"
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate text-meta font-medium text-content">
                  {location}
                </span>
                <span className="mt-0.5 block text-label text-content-muted">
                  {count} upcoming {count === 1 ? 'match' : 'matches'}
                </span>
              </span>
              <CaretRight size={14} aria-hidden="true" className="shrink-0 text-content-faint" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
