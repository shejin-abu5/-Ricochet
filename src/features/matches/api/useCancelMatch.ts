import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cancelMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useUiStore } from '../../../shared/uiStore'
import type { Match } from '../types'

/**
 * Cancels a match. Unlike join/leave, this is deliberately NOT optimistic.
 *
 * An optimistic update bets the server will agree, which pays off for frequent,
 * cheap-to-undo actions. Cancelling is none of those: it happens once per match,
 * it's terminal (the server won't un-cancel), and the user has just confirmed it
 * in a modal — they're braced for a moment's work and want certainty, not speed.
 * Showing "cancelled" and then flipping it back on a 403 is worse than a spinner.
 */
export function useCancelMatch(matchId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: () => cancelMatch(matchId),

    onSuccess: (serverMatch) => {
      // Same patch-everywhere problem as useJoinMatch: without the list writes,
      // navigating back to Discover shows the card still looking joinable until
      // the refetch lands. The response is the updated match, so there's
      // nothing to construct.
      queryClient.setQueryData<Match>(matchKeys.detail(matchId), serverMatch)

      queryClient.setQueriesData<Match[]>({ queryKey: ['matches', 'list'] }, (old) =>
        old?.map((m) => (m.id === matchId ? serverMatch : m))
      )

      showToast('Match cancelled')
    },

    onError: (error) => {
      // Nothing to roll back, since nothing was changed ahead of the response.
      showToast(error.message, 'error')
    },

    // Cancelling moves the match between the upcoming and past lists — the
    // patch above can't do that, since it only rewrites entries already in an
    // array. Only the server knows each list's correct contents.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}
