import { useQuery } from '@tanstack/react-query'
import { fetchMatches } from './matchesApi'
import type { MatchFilters } from '../types'

/**
 * Query keys for the matches cache, shaped as a tree so callers can pick their
 * invalidation blast radius:
 *
 *   matchKeys.all         → every matches entry
 *   ['matches', 'list']   → every filtered list, no detail entries
 *   matchKeys.detail(id)  → one match
 *
 * Built here rather than inline in components so two callers can't spell the
 * same key differently and silently end up with two cache entries.
 *
 * Every value the queryFn reads must appear in the key — omitting `q` would
 * make a search reuse the unsearched result and appear to do nothing.
 */
export const matchKeys = {
  all: ['matches'] as const,
  list: (filters: MatchFilters) => ['matches', 'list', filters] as const,
  detail: (id: string) => ['matches', 'detail', id] as const,
}

export function useMatches(filters: MatchFilters) {
  return useQuery({
    queryKey: matchKeys.list(filters),
    queryFn: () => fetchMatches(filters),

    // Hold the previous filter's results while the new ones load instead of
    // collapsing to skeletons on every filter change. `isFetching` still
    // reports the in-flight request, so the list can be dimmed.
    placeholderData: (previousData) => previousData,
  })
}
