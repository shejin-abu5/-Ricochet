import { useQuery } from '@tanstack/react-query'
import { fetchMatch } from './matchesApi'
import { matchKeys } from './useMatches'

/**
 * Fetch ONE match, for the detail page.
 *
 * Almost identical to useMatches — which is the point. Once you've learned
 * useQuery, every read in the app is this same four-line shape. The
 * interesting code is always the MUTATIONS.
 *
 * ---- WHY NOT REUSE THE LIST DATA WE ALREADY HAVE? ----
 *
 * You arrived here by clicking a card, so the match is already sitting in a
 * cached list. Tempting to dig it out and skip the request. Two reasons not
 * to:
 *
 *   1. You can also arrive by pasting the URL, or by refreshing. Then there
 *      is no cached list, and the "optimisation" is now a bug.
 *   2. The list endpoint and the detail endpoint may return different
 *      amounts of data. (Ours don't yet — but the moment the detail page
 *      needs, say, each player's position, they will.)
 *
 * Fetch what the screen needs. Query's caching is what makes that cheap.
 * (If the flash of a loading state bothers you, the real fix is Query's
 * `initialData`/`placeholderData` — seeding the detail entry from the list
 * so it renders instantly AND still refetches. Worth trying later.)
 */
export function useMatch(id: string) {
  return useQuery({
    queryKey: matchKeys.detail(id),
    queryFn: () => fetchMatch(id),

    /**
     * Don't retry a match that doesn't exist. Query retries failed requests
     * 3 times by default, which is right for a flaky network and pointless
     * for a 404 — it just makes the "not found" screen take 3x longer.
     *
     * `retry` can be a function: return false to give up, true to keep going.
     */
    retry: (failureCount, error) => {
      if (error.message.includes('does not exist')) return false
      return failureCount < 2
    },
  })
}
