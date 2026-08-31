import { useQuery } from '@tanstack/react-query'
import { fetchTeams } from './teamsApi'
import type { TeamFilters } from '../types'

/**
 * ============================================================
 *  THE SAME KEY TREE, A SECOND TIME
 * ============================================================
 *
 * Compare this to matchKeys in features/matches/api/useMatches.ts. Identical
 * structure, different prefix:
 *
 *   ['teams']                       ← all
 *     ['teams','list',{q:'kochi'}]  ← every filtered list
 *     ['teams','detail','t1']       ← one team
 *
 * Two things follow from copying the shape rather than inventing a new one.
 *
 * 1. INVALIDATION STAYS PREDICTABLE. `invalidateQueries({ queryKey:
 *    teamKeys.all })` reaches every team query and nothing else — matches are
 *    untouched because they start with a different first segment. Two features
 *    sharing a cache without interfering, purely because of key design.
 *
 * 2. YOU STOP THINKING ABOUT IT. The third feature does not need a decision;
 *    it needs a copy. Conventions are worth more than cleverness here, and
 *    "we do keys this way" is a much better answer than six files that
 *    each invented their own scheme.
 */
export const teamKeys = {
  all: ['teams'] as const,
  list: (filters: TeamFilters) => ['teams', 'list', filters] as const,
  detail: (id: string) => ['teams', 'detail', id] as const,
}

export function useTeams(filters: TeamFilters) {
  return useQuery({
    queryKey: teamKeys.list(filters),
    queryFn: () => fetchTeams(filters),
    // Keep the previous results on screen while a new search loads, instead of
    // flashing skeletons on every keystroke. Same as useMatches.
    placeholderData: (previousData) => previousData,
  })
}
