import type { MatchFilters as Filters, MatchFormat } from '../types'

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

  const noFilters = !filters.format && !filters.date

  return (
    <div className="flex flex-col gap-3">
      <input
        type="search"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by title or location"
        aria-label="Search matches"
        className="min-h-11 w-full rounded-control border border-border bg-raised px-3 text-body text-content placeholder:text-content-faint"
      />

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
            active chip clears it. */}
        <Chip
          label="All matches"
          isActive={noFilters}
          onClick={() => onFilterChange({ ...filters, format: undefined, date: undefined })}
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
