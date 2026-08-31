import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useUiStore } from '../../../shared/uiStore'
import type { Match } from '../types'

/**
 * ============================================================
 *  CANCEL A MATCH — and why this one is NOT optimistic
 * ============================================================
 *
 * useJoinMatch.ts goes to considerable trouble to update the screen before the
 * server has agreed: snapshot the cache, lie, roll back on failure. This hook
 * deliberately does none of that, and the contrast is deliberate.
 *
 * Optimistic updates are a BET that the server will say yes. The bet is worth
 * making when:
 *
 *   - the action is frequent          you tap Join constantly
 *   - the action is cheap to undo     a name appears and disappears
 *   - the wait is the whole cost      900ms of nothing is the only problem
 *
 * Cancelling a match is the opposite on all three:
 *
 *   - it happens once per match, ever
 *   - it is DESTRUCTIVE and terminal — the server refuses to un-cancel
 *   - the user has just confirmed it in a modal, so they are already braced
 *     for a moment of "working on it". They are not expecting instant; they
 *     are expecting CERTAIN.
 *
 * Showing the match as cancelled before the server agrees, and then flipping
 * it back because the request 403'd, is a far worse experience here than a
 * 700ms spinner. For a destructive action, honesty beats speed.
 *
 * "When would you NOT use an optimistic update?" is the follow-up question to
 * the optimistic-updates question, and this is the answer.
 */
export function useCancelMatch(matchId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: () => cancelMatch(matchId),

    onSuccess: (serverMatch) => {
      /**
       * The same "patch it everywhere" problem useJoinMatch solves, for the
       * same reason: this match is cached under its own detail key AND inside
       * every list the user has scrolled. Updating only the detail entry means
       * navigating back to Discover shows the card still looking joinable
       * until the refetch lands.
       *
       * setQueryData writes the server's own object rather than a guess we
       * construct — there is nothing to guess, because the response IS the
       * updated match.
       */
      queryClient.setQueryData<Match>(matchKeys.detail(matchId), serverMatch)

      queryClient.setQueriesData<Match[]>({ queryKey: ['matches', 'list'] }, (old) =>
        old?.map((m) => (m.id === matchId ? serverMatch : m))
      )

      showToast('Match cancelled')
    },

    onError: (error) => {
      // No rollback to do — we never changed anything. That is the whole
      // benefit of skipping the optimistic step: the failure path is one line.
      showToast(error.message, 'error')
    },

    /**
     * Cancelling moves the match from the "upcoming" list to the "past" one,
     * so BOTH lists are now wrong in a way that setQueriesData above cannot
     * fix: the match needs to leave one array and appear in another, and only
     * the server knows the correct contents of each.
     *
     * Invalidating the whole `matches` tree refetches them. The cache patch
     * above is what makes the screen correct instantly; this is what makes it
     * correct properly.
     */
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}
