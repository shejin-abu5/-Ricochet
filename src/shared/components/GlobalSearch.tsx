import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MagnifyingGlass } from '@phosphor-icons/react'

/**
 * The header search pill. Submitting navigates to Discover with the query
 * applied — /?q=turf — which needs no store, context or prop drilling, because
 * DiscoverPage already reads its filters from the URL.
 *
 * The placeholder says "matches" because matches is all it searches; it grows
 * when teams and players become searchable.
 *
 * Local state rather than the URL for the same reason as Discover's own input:
 * writing per keystroke would push a history entry per letter. The URL is
 * written once, on submit.
 */

interface GlobalSearchProps {
  className?: string
}

export function GlobalSearch({ className = '' }: GlobalSearchProps) {
  const [value, setValue] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()

    const query = value.trim()
    // An empty submit clears rather than navigating to a bare `?q=`.
    navigate(query ? `/?q=${encodeURIComponent(query)}` : '/')
  }

  return (
    // A real form, not an input watching for Enter: submit comes free, and
    // role="search" makes this a landmark screen-reader users can jump to.
    <form role="search" onSubmit={handleSubmit} className={className}>
      <label className="relative flex items-center">
        <span className="sr-only">Search matches</span>

        <MagnifyingGlass
          size={18}
          aria-hidden="true"
          // pointer-events-none so clicking the icon focuses the input beneath.
          className="pointer-events-none absolute left-4 text-content-faint"
        />

        <input
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Search matches"
          // 14px is safe here despite iOS zooming inputs under 16px: this is
          // hidden below `sm`, where a pointer is doing the focusing.
          className="min-h-11 w-full rounded-pill border border-border bg-raised pl-11 pr-4 text-meta text-content transition-colors placeholder:text-content-faint hover:border-border-strong focus:border-border-strong"
        />
      </label>
    </form>
  )
}
