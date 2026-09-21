import { useQuery } from '@tanstack/react-query'
import { fetchTeam } from './teamsApi'
import { teamKeys } from './useTeams'

/**
 * Fetches one team, with its full roster.
 *
 * Cannot read from a cached list: the list endpoint strips `members` to keep
 * the payload small, so it does not contain the roster this page exists to show.
 */
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => fetchTeam(id),

    // A 404 won't fix itself; retrying just delays the not-found screen.
    retry: (failureCount, error) => {
      if (error.message.includes('does not exist')) return false
      return failureCount < 2
    },
  })
}
