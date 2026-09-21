import { useQuery } from '@tanstack/react-query'
import { fetchTeams } from './teamsApi'
import type { TeamFilters } from '../types'

/**
 * Same key tree as matchKeys, different prefix — so invalidating teamKeys.all
 * reaches every team query and touches nothing in the matches cache.
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
    // Hold previous results while a new search loads, rather than flashing
    // skeletons on every keystroke.
    placeholderData: (previousData) => previousData,
  })
}
