import { useQuery } from '@tanstack/react-query'
import { fetchMatches } from './matchesApi'
import type { MatchFilters } from '../types'

/**
 * ============================================================
 *  QUERY KEYS — the single most important idea in this phase
 * ============================================================
 *
 * TanStack Query keeps a cache: a big box of previously-fetched data.
 * The queryKey is the LABEL on each item in that box — its address.
 *
 * Two different keys = two separately cached lists:
 *
 *   ['matches', { format: '5v5' }]   → its own entry
 *   ['matches', { format: '7v7' }]   → a DIFFERENT entry
 *
 * So when you switch the filter from 5v5 to 7v7, Query looks for that
 * address, doesn't find it, and fetches. Switch BACK to 5v5 and it finds
 * the earlier result and renders it INSTANTLY — then quietly refetches in
 * the background to check it's still accurate.
 *
 * That behaviour ("stale-while-revalidate") is free, and it's the reason
 * people use this library instead of useEffect + fetch. Open the React
 * Query Devtools (bottom corner of the app) and watch entries appear as
 * you change filters.
 *
 * THE RULE: every value the queryFn uses must appear in the queryKey.
 * If `q` were missing from the key below, searching for "turf" would
 * reuse the unsearched result and appear to do nothing — a genuinely
 * confusing bug.
 */

/**
 * Centralising key construction here (rather than typing the array inline
 * in components) means there's one place to change the shape, and no risk
 * of two components accidentally using slightly different keys for the
 * same data — which would silently create two cache entries.
 *
 * ---- PHASE 2C ADDITION: `detail` ----
 *
 * Notice the SHAPE of these three. They form a tree:
 *
 *   ['matches']                             ← all
 *     ['matches','list',{...}]              ← every filtered list
 *     ['matches','detail','m3']             ← one match
 *
 * That hierarchy is what lets you choose your blast radius later:
 *
 *   invalidateQueries({ queryKey: matchKeys.all })        → everything
 *   invalidateQueries({ queryKey: ['matches','list'] })   → just the lists
 *   invalidateQueries({ queryKey: matchKeys.detail(id) }) → just one match
 *
 * The 'list' and 'detail' segments look like noise until the day you need
 * exactly one of those three. Design keys as a tree from the start.
 */
export const matchKeys = {
  all: ['matches'] as const,
  list: (filters: MatchFilters) => ['matches', 'list', filters] as const,
  detail: (id: string) => ['matches', 'detail', id] as const,
}

export function useMatches(filters: MatchFilters) {
  return useQuery({
    queryKey: matchKeys.list(filters),

    // The function that actually fetches. Query calls this only when it
    // decides it needs fresh data — not on every render.
    queryFn: () => fetchMatches(filters),

    /**
     * Keep showing the PREVIOUS filter's results while the new ones load,
     * instead of blanking the list to skeletons on every filter change.
     * The list stays on screen and just updates — much less jarring.
     * (`isFetching` still tells us a request is in flight, so we can dim it.)
     */
    placeholderData: (previousData) => previousData,
  })
}
