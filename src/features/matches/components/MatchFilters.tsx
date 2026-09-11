import type { MatchFilters as Filters, MatchFormat } from '../types'
import { MatchQuickFilter, type QuickFilter } from './MatchQuickFilter'

interface MatchFiltersProps {
  filters: Filters
  /** Search box value, kept separate because it updates on every keystroke. */
  searchValue: string
  onSearchChange: (value: string) => void
  onFilterChange: (next: Filters) => void
}

const formats: MatchFormat[] = ['5v5', '7v7', '11v11']

const dateOptions = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
] as const

/**
 * A single filter chip. Pulled out as its own tiny component because we
 * render it seven times below — and because "how does a chip look when
 * active" is now defined in exactly one place.
 */
function Chip({
  label,
  isActive,
  onClick,
}: {
  label: string
  isActive: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // aria-pressed tells screen readers this is a toggle and whether it's
      // currently on. Colour alone doesn't communicate state to everyone.
      aria-pressed={isActive}
      /**
       * The active chip is a TINT (bg-primary/10 + text-primary), not a solid
       * lime fill. The reference fills it, but there's a row of these sitting
       * directly above a grid of cards — a saturated block of #d2ff00 that
       * wide is genuinely hard on the eyes, and it out-shouts the actual
       * primary action on the page.
       *
       * The tint still reads unambiguously as "selected": it's the only chip
       * with any colour in it at all. See the rule in Badge.tsx.
       *
       * min-h-9 keeps the chip a usable tap target — the reference's chips are
       * visually short, so the height comes from padding rather than a taller
       * pill, which keeps the proportions right while staying tappable.
       */
      className={`min-h-9 shrink-0 whitespace-nowrap rounded-pill px-4 text-meta transition-colors ${
        isActive
          ? 'bg-primary/10 font-medium text-primary'
          : 'bg-raised text-content-muted hover:bg-hover hover:text-content'
      }`}
    >
      {label}
    </button>
  )
}

export function MatchFilters({
  filters,
  searchValue,
  onSearchChange,
  onFilterChange,
}: MatchFiltersProps) {
  /**
   * Chips TOGGLE: tapping the active one clears it. Passing `undefined`
   * removes that filter entirely (see DiscoverPage — undefined values get
   * deleted from the URL rather than written as empty strings).
   */
  const toggleFormat = (format: MatchFormat) => {
    onFilterChange({ ...filters, format: filters.format === format ? undefined : format })
  }

  const toggleDate = (date: 'today' | 'week') => {
    onFilterChange({ ...filters, date: filters.date === date ? undefined : date })
  }

  /**
   * ---- CONVERTING AT THE BOUNDARY ----
   *
   * The dropdown speaks three values ('all' | 'available' | 'night'); the
   * filter object stores two, plus absence. A <select> has to render SOME
   * value — there is no such thing as a dropdown showing nothing — while the
   * filters object already has a perfectly good word for "don't narrow by
   * this", and it is `undefined`, same as `format`, `date` and `q`.
   *
   * Rather than bend either side to match the other, translate here, in the
   * one place that touches both:
   *
   *   IN   filters.show ?? 'all'                absence → 'all'
   *   OUT  next === 'all' ? undefined : next    'all'   → absence
   *
   * The payoff for NOT storing 'all' shows up two files away: DiscoverPage's
   * URL writer deletes falsy values, so picking "Any match" cleans ?show= out
   * of the address bar by itself. If 'all' were storable there would be two
   * spellings of "no filter", every reader downstream would have to check for
   * both, and the URL would carry a meaningless ?show=all.
   */
  const handleShowChange = (next: QuickFilter) => {
    onFilterChange({ ...filters, show: next === 'all' ? undefined : next })
  }

  /**
   * `show` belongs in here too. Without it the "All matches" chip sits there
   * glowing active while the dropdown quietly hides half the list — the UI
   * contradicting itself.
   *
   * This line is a standing maintenance cost: every new filter has to be added
   * to it, nothing errors when you forget, and the only symptom is a chip that
   * lies. Its twin is `hasFilters` in DiscoverPage.tsx.
   */
  const noFilters = !filters.format && !filters.date && !filters.show

  return (
    <div className="flex flex-col gap-3">
      {/**
       * Search and the quick filter share a row: stacked on a phone, side by
       * side from `sm` up.
       *
       * The dropdown deliberately does NOT go in the chip row below. That row
       * is `overflow-x-auto` — it scrolls sideways on a narrow screen — so a
       * select inside it can scroll out of reach, and dragging to open a
       * native picker fights the horizontal scroll gesture.
       *
       * flex-1 on the input, shrink-0 on the select: when space runs out the
       * SEARCH BOX gives up width. A search box degrades gracefully at any
       * width; a dropdown with a clipped label does not.
       */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or location"
          aria-label="Search matches"
          className="min-h-11 w-full flex-1 rounded-control border border-border bg-raised px-3 text-body text-content placeholder:text-content-faint"
        />

        {/* Width is passed IN rather than baked into the component — layout is
            the parent's job. Same contract as GlobalSearch. */}
        <MatchQuickFilter
          value={filters.show ?? 'all'}
          onChange={handleShowChange}
          className="shrink-0 sm:w-48"
        />
      </div>

      {/**
       * overflow-x-auto so the chip row scrolls sideways on a narrow phone
       * instead of wrapping into a tall stack that pushes the list down.
       *
       * [scrollbar-width:none] hides the scrollbar itself — on a short row of
       * chips it's visual noise, and the row's own overflow is obvious from
       * the half-cut chip at the edge.
       */}
      <div
        role="group"
        aria-label="Filter matches"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {/* "All matches" is a chip like the others, active when nothing else
            is — matching the reference. It gives people an obvious way BACK to
            the unfiltered list, rather than having to remember that tapping an
            active chip clears it. It clears `show` too, so it cannot leave the
            dropdown narrowing a list it claims is unfiltered. */}
        <Chip
          label="All matches"
          isActive={noFilters}
          onClick={() =>
            onFilterChange({ ...filters, format: undefined, date: undefined, show: undefined })
          }
        />

        {dateOptions.map((option) => (
          <Chip
            key={option.value}
            label={option.label}
            isActive={filters.date === option.value}
            onClick={() => toggleDate(option.value)}
          />
        ))}

        {formats.map((format) => (
          <Chip
            key={format}
            label={format}
            isActive={filters.format === format}
            onClick={() => toggleFormat(format)}
          />
        ))}
      </div>
    </div>
  )
}
