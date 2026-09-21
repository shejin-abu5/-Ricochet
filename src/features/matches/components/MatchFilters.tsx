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
      // aria-pressed marks this as a toggle and reports its state; colour alone
      // doesn't communicate "selected" to everyone.
      aria-pressed={isActive}
      // A tint rather than the reference's solid lime fill: a row of saturated
      // #d2ff00 sitting above a card grid out-shouts the page's actual primary
      // action. Being the only chip with any colour still reads as selected.
      // min-h-9 keeps the tap target usable while the padding holds the
      // reference's short proportions.
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
  // Chips toggle: tapping the active one passes undefined, which DiscoverPage
  // deletes from the URL rather than writing as an empty param.
  const toggleFormat = (format: MatchFormat) => {
    onFilterChange({ ...filters, format: filters.format === format ? undefined : format })
  }

  const toggleDate = (date: 'today' | 'week') => {
    onFilterChange({ ...filters, date: filters.date === date ? undefined : date })
  }

  /**
   * Translates between the dropdown's three values and the filter object's two
   * plus absence. A <select> must render something, so it needs an explicit
   * 'all'; the filter object already spells "don't narrow" as `undefined`.
   *
   * Converting here keeps 'all' out of storage, which is what lets DiscoverPage's
   * falsy-value deletion strip ?show= from the URL on its own.
   */
  const handleShowChange = (next: QuickFilter) => {
    onFilterChange({ ...filters, show: next === 'all' ? undefined : next })
  }

  /**
   * `show` has to be counted here, or the "All matches" chip sits active while
   * the dropdown quietly hides half the list.
   *
   * Standing maintenance cost: a new filter must be added here, nothing errors
   * if you forget, and the only symptom is a chip that lies. Twin of
   * `hasFilters` in DiscoverPage.tsx.
   */
  const noFilters = !filters.format && !filters.date && !filters.show

  return (
    <div className="flex flex-col gap-3">
      {/* The dropdown stays out of the chip row below, which is overflow-x-auto:
          a select inside it can scroll out of reach, and dragging to open the
          native picker fights the horizontal scroll gesture.

          flex-1 on the input, shrink-0 on the select, so the search box is what
          gives up width — it degrades gracefully, a clipped dropdown label
          doesn't. */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by title or location"
          aria-label="Search matches"
          className="min-h-11 w-full flex-1 rounded-control border border-border bg-raised px-3 text-body text-content placeholder:text-content-faint"
        />

        <MatchQuickFilter
          value={filters.show ?? 'all'}
          onChange={handleShowChange}
          className="shrink-0 sm:w-48"
        />
      </div>

      {/* Scrolls sideways on a narrow phone rather than wrapping into a tall
          stack that pushes the list down. The scrollbar is hidden because the
          half-cut chip at the edge already signals the overflow. */}
      <div
        role="group"
        aria-label="Filter matches"
        className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
      >
        {/* An explicit way back to the unfiltered list, rather than relying on
            people remembering that tapping an active chip clears it. It clears
            `show` too, so it can't leave the dropdown narrowing a list it
            claims is unfiltered. */}
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
