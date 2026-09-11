import { CaretDown } from '@phosphor-icons/react'

/**
 * The control's vocabulary. 'all' is the "no filter" option and exists only
 * here — the data model in ../types.ts stores just the two narrowing values,
 * because "no filter" is already spelled `undefined` there.
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
 * A filter dropdown. Controlled and presentational: it draws the value it's
 * given and reports changes. It doesn't know about the URL, and it doesn't
 * know what "available" means.
 *
 * A real <select> rather than a custom dropdown, so keyboard nav, type-ahead,
 * the iOS wheel picker and screen-reader semantics come free. The open list is
 * drawn by the OS — no CSS here reaches it — and renders dark only because
 * index.css sets `color-scheme: dark`.
 */
export function MatchQuickFilter({ value, onChange, className = '' }: MatchQuickFilterProps) {
  const isActive = value !== 'all'

  return (
    <label className={`relative flex items-center ${className}`}>
      {/* No visible label, so a screen reader would otherwise announce this as
          a bare "combo box" with no clue what it filters. */}
      <span className="sr-only">Filter matches</span>

      <select
        value={value}
        // Safe cast: every <option> below is generated from `options`, so no
        // other string can come out of this.
        onChange={(event) => onChange(event.target.value as QuickFilter)}
        /**
         * appearance-none drops the OS arrow so we can draw our own, and pr-9
         * keeps long labels from sliding under it. text-body is 16px because
         * iOS Safari zooms the page in on any control with a smaller font.
         * min-h-11 is a 44px tap target and matches the search input beside it.
         *
         * Active is a TINT, never a solid fill: solid lime is reserved for the
         * one primary action per screen. Same rule as the chips.
         */
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
