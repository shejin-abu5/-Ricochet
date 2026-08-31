import { useQuery } from '@tanstack/react-query'
import { fetchTeam } from './teamsApi'
import { teamKeys } from './useTeams'

/**
 * Fetch ONE team, with its full roster.
 *
 * ---- WHY THIS CANNOT REUSE THE LIST DATA ----
 *
 * With matches, reusing the cached list entry was merely a bad idea (you can
 * arrive by pasting a URL, and the shapes may diverge later). With teams it is
 * flatly impossible: the list endpoint strips `members` to keep the payload
 * small, so the cached list literally does not contain the roster this page
 * exists to display.
 *
 * That is the general case. "The list already has it" is usually false as soon
 * as an API is doing its job properly — list and detail views want different
 * amounts of data, so they return different amounts of data.
 */
export function useTeam(id: string) {
  return useQuery({
    queryKey: teamKeys.detail(id),
    queryFn: () => fetchTeam(id),

    // Don't burn three retries on a team that doesn't exist — it just makes
    // the "not found" screen take 3x longer to appear. Same as useMatch.
    retry: (failureCount, error) => {
      if (error.message.includes('does not exist')) return false
      return failureCount < 2
    },
  })
}
