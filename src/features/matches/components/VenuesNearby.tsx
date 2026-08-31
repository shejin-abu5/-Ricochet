import { Link } from 'react-router-dom'
import { CaretRight } from '@phosphor-icons/react'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useMatches } from '../api/useMatches'
import venuePlaceholder from '../../../assets/venue-placeholder.svg'

/** Four is enough to be useful in a sidebar and short enough not to scroll. */
const MAX_VENUES = 4

/**
 * "Venues nearby" — the other places with games coming up.
 *
 * ---- WHERE THIS DATA COMES FROM, AND WHAT IT ISN'T ----
 *
 * There is no Venue entity. `Match.location` is a free-text string, and
 * docs/14-feature-backlog.md #11 lists a real venue directory (pitch type,
 * photos, directions) as future work that needs a content pipeline.
 *
 * So this does NOT invent one. It derives from data we already have: group the
 * upcoming matches by their location string, drop the one you're already
 * looking at, and rank by how many games each venue has coming up. Every number
 * on this card is a fact the app can actually stand behind.
 *
 * "Nearby" is doing some honest work in the title — we have no coordinates, so
 * this is really "other active venues". That reads as nearby because the seed
 * data is all one city, and it becomes literally true the day locations carry
 * lat/lng. Worth knowing that's the shortcut, rather than discovering it later.
 *
 * ---- THE THUMBNAIL ----
 *
 * Every row shows the SAME picture, imported once at the top of this file.
 * That's deliberate, and the tradeoff is worth understanding rather than just
 * copying:
 *
 *   - No venue in the seed data has a photo, and per the backlog note above,
 *     real ones need a content pipeline nobody has built yet. One shared
 *     placeholder is the honest version of "a photo goes here".
 *   - The cost is repetition — four identical squares down a sidebar can read
 *     as noise. So it's drawn deliberately quiet (a dim pitch outline, no
 *     bright fills) and behaves like texture on the row instead of competing
 *     with the venue name, which is the thing you actually came here to read.
 *
 * Because the import is just a URL string, this is ONE network request no
 * matter how many rows render — the browser caches the file after the first
 * `<img>` and reuses it for the rest. The day venues carry real photos, the
 * change is `venue.imageUrl ?? venuePlaceholder` and nothing else in this file
 * has to move.
 *
 * ---- THE CACHE KEY DETAIL WORTH NOTICING ----
 *
 * useMatches({}) looks like it would fetch a second copy of the list that
 * DiscoverPage already has. It doesn't. Discover passes
 * { format: undefined, date: undefined, q: undefined }, and TanStack Query
 * hashes keys through JSON.stringify, which DROPS undefined values — so both
 * serialise to the same key and share one cache entry. Navigating here from the
 * list renders this card instantly from cache.
 */
export function VenuesNearby({ currentLocation }: { currentLocation: string }) {
  // Empty filters = every upcoming match. This is server data, so it lives in
  // TanStack Query and never in a Zustand store — the rule in CLAUDE.md.
  const { data: matches, isPending } = useMatches({})

  if (isPending) {
    return (
      <section aria-busy="true" className="rounded-card border border-border bg-surface p-5">
        <Skeleton className="h-5 w-32" />
        <div className="mt-4 flex flex-col gap-4">
          {[0, 1, 2].map((row) => (
            /**
             * The skeleton mirrors the real row's shape — square on the left,
             * two lines of text beside it. If it stayed text-only, the
             * thumbnails would pop in on load and shove every row taller,
             * which is exactly the layout shift a skeleton exists to prevent.
             */
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

  /**
   * A Map keyed by location name, counting matches at each.
   *
   * A Map rather than a plain object because the keys are arbitrary user-ish
   * strings — an object would happily let a venue called "constructor" collide
   * with something on Object.prototype. Map has no prototype keys to collide
   * with, and it preserves insertion order.
   */
  const countByVenue = new Map<string, number>()
  for (const match of matches ?? []) {
    if (match.location === currentLocation) continue
    countByVenue.set(match.location, (countByVenue.get(match.location) ?? 0) + 1)
  }

  const venues = [...countByVenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_VENUES)

  // Nothing to show beats an empty box with a heading on it. Returning null
  // removes the card entirely rather than leaving a hole in the sidebar.
  if (venues.length === 0) return null

  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="text-heading text-content">Venues nearby</h2>
      <p className="mt-1 text-meta text-content-muted">Other places with games coming up.</p>

      <ul className="mt-4 flex flex-col">
        {venues.map(([location, count]) => (
          <li key={location}>
            {/**
             * Links to Discover with the venue as the free-text query. That
             * filter already exists — MatchFilters.q searches title AND
             * location, and DiscoverPage reads `q` straight off the URL — so
             * this needs no new endpoint, no new state, and the result page is
             * shareable and back-button-able because the query is in the URL.
             *
             * encodeURIComponent for the same reason as the maps link: venue
             * names contain spaces and ampersands.
             *
             * -mx-2 with px-2 lets the hover highlight bleed past the card's
             * text alignment, so the row looks like a full-width target while
             * the text stays lined up with the heading above it.
             */}
            <Link
              to={`/?q=${encodeURIComponent(location)}`}
              className="-mx-2 flex min-h-11 items-center gap-3 rounded-control px-2 py-2 transition-colors hover:bg-raised"
            >
              {/**
               * alt="" is not a forgotten alt, it's an EMPTY one — the correct
               * markup for a decorative image. It tells a screen reader to skip
               * the picture entirely instead of reading out a filename. Same
               * reasoning as the `aria-hidden` inside Avatar: the venue name is
               * already right there in text, so the image adds nothing to hear.
               *
               * The border isn't decoration either. The thumbnail's fill is
               * `bg-raised` (see below), which is exactly the row's hover
               * colour — so without an edge it would dissolve into the row the
               * moment you moused over it.
               *
               * rounded-control (8px) is the same radius the row uses, so the
               * square sits inside the hover highlight instead of fighting it.
               * width/height match the rendered size so the browser reserves
               * the space before the file loads. object-cover is for the day
               * these become real photos of assorted shapes: it crops to fill
               * the square rather than squashing the picture into it.
               */}
              <img
                src={venuePlaceholder}
                alt=""
                width={40}
                height={40}
                /**
                 * bg-raised is load-bearing, not decoration. The artwork's own
                 * background rect was removed so the file could stay usable at
                 * any size without a hard-edged square around it, which means
                 * the SVG is now transparent — its fill has to come from here
                 * instead. That's also the more correct place for it: a
                 * backdrop is this thumbnail's styling, not a property of the
                 * drawing.
                 */
                className="h-10 w-10 shrink-0 rounded-control border border-border bg-raised object-cover"
              />

              <span className="min-w-0 flex-1">
                {/* truncate needs min-w-0 on its flex ancestor — flex items
                    refuse to shrink below their content width otherwise. */}
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
