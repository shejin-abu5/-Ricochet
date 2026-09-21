import { CaretDown } from '@phosphor-icons/react'

/**
 * The control's vocabulary. 'all' exists only here — MatchFilters in ../types.ts
 * stores just the narrowing values, since "no filter" is already `undefined`.
 */
export type QuickFilter = 'all' | 'available' | 'night'

// "Any match", not "All matches" — the chip row already owns that phrase.
const options: { value: QuickFilter; label: string }[] = [
  { value: 'all', label: 'Any match' },
  { value: 'available', label: 'Available only' },
  { value: 'night', label: 'Night games' },
]

interface MatchQuickFilterProps {
  value: QuickFilter
  onChange: (next: QuickFilter) => void
  /** Width and spacing are the parent's call, not this component's. */
  className?: string
}

/**
 * Controlled filter dropdown. Presentational — it doesn't know about the URL,
 * and it doesn't know what "available" means.
 *
 * A real <select> rather than a custom dropdown, so keyboard nav, type-ahead,
 * the iOS wheel picker and screen-reader semantics come free. The open list is
 * drawn by the OS and renders dark only because index.css sets
 * `color-scheme: dark` — no CSS here reaches it.
 */
export function MatchQuickFilter({ value, onChange, className = '' }: MatchQuickFilterProps) {
  const isActive = value !== 'all'

  return (
    <label className={`relative flex items-center ${className}`}>
      {/* Without this the control announces as a bare "combo box" with no clue
          what it filters. */}
      <span className="sr-only">Filter matches</span>

      <select
        value={value}
        // Safe cast: every option is generated from `options`, so no other
        // string can come out of this.
        onChange={(event) => onChange(event.target.value as QuickFilter)}
        // text-body is 16px because iOS Safari zooms the page in on any control
        // with a smaller font. min-h-11 is a 44px target, matching the search
        // input beside it. Active is a tint — solid lime is reserved for the
        // one primary action per screen, same rule as the chips.
        className={`min-h-11 w-full cursor-pointer appearance-none rounded-control border px-3 pr-9 text-body transition-colors ${
          isActive
            ? 'border-primary/40 bg-primary/10 font-medium text-primary'
            : 'border-border bg-raised text-content hover:bg-hover'
        }`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {/* pointer-events-none so clicking the arrow hits the select underneath
          instead of a dead glyph. */}
      <CaretDown
        size={14}
        weight="bold"
        aria-hidden="true"
        className={`pointer-events-none absolute right-3 ${
          isActive ? 'text-primary' : 'text-content-muted'
        }`}
      />
    </label>
  )
}
