import { useQuery } from '@tanstack/react-query'
import { fetchMatch } from './matchesApi'
import { matchKeys } from './useMatches'

/**
 * Fetches one match for the detail page.
 *
 * Deliberately refetches rather than reading the match out of a cached list:
 * the page is also reachable by pasted URL or refresh, where no list exists,
 * and the detail endpoint is free to return more than the list one does.
 */
export function useMatch(id: string) {
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: () => fetchMatch(id),

    // A 404 won't fix itself, and the default 3 retries just make the
    // not-found screen take three times as long to appear.
    retry: (failureCount, error) => {
      if (error.message.includes('does not exist')) return false
      return failureCount < 2
    },
  })
}
