import { Card } from '../../../shared/components/Card'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { Button } from '../../../shared/components/Button'
import { MatchCard } from './MatchCard'
import type { Match } from '../types'

interface MatchListProps {
  matches: Match[] | undefined
  isPending: boolean
  isError: boolean
  /** True while ANY fetch is in flight, including a background refetch. */
  isFetching: boolean
  onRetry: () => void
  onClearFilters: () => void
  hasFilters: boolean
}

function MatchCardSkeleton() {
  return (
    <Card>
      <div className="flex justify-between gap-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-3 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="mt-4 h-5 w-full" />
    </Card>
  )
}

// The grid's default items-stretch equalises card heights per row, which is
// what lets MatchCard's mt-auto footer line up across a row when one title
// wraps to two lines and its neighbour doesn't.
const gridClasses = 'grid grid-cols-1 gap-3 sm:grid-cols-2'

/**
 * Renders the loading, error, empty and success states of a match list.
 *
 * Error and empty stay distinct: "no matches found" while the server is down
 * tells the user to widen filters that aren't the problem.
 *
 * Takes plain props rather than calling useMatches itself, so other screens can
 * reuse it without inheriting Discover's filtering.
 */
export function MatchList({
  matches,
  isPending,
  isError,
  isFetching,
  onRetry,
  onClearFilters,
  hasFilters,
}: MatchListProps) {
  if (isPending) {
    return (
      // aria-busy on the container so a screen reader hears "busy" once rather
      // than a stream of empty boxes.
      <div aria-busy="true" className={gridClasses}>
        {Array.from({ length: 4 }).map((_, i) => (
          <MatchCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Always offers a retry: docs/03 treats errors as recoverable, not dead ends.
  if (isError) {
    return (
      <EmptyState
        title="Couldn't load matches"
        description="Something went wrong on our end."
        action={
          <Button variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    )
  }

  if (!matches || matches.length === 0) {
    return (
      <EmptyState
        title="No matches found"
        description={
          hasFilters
            ? 'Try widening your filters.'
            : 'There are no upcoming matches right now.'
        }
        action={
          hasFilters ? (
            <Button variant="secondary" onClick={onClearFilters}>
              Clear filters
            </Button>
          ) : undefined
        }
      />
    )
  }

  return (
    // useMatches keeps the previous results on screen during a refetch, so this
    // dim is the only cue that what you're reading is about to change.
    <div
      className={`${gridClasses} transition-opacity ${
        isFetching ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  )
}
