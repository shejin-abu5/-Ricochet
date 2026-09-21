import { useMutation, useQueryClient } from '@tanstack/react-query'
import { respondToMembership } from './invitesApi'
import { inviteKeys } from './useInvites'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'

/**
 * Answers an invite or a join request.
 *
 * Accepting changes two entities server-side: the membership row leaves the
 * queue, AND someone appears on the team roster. Invalidating only ['invites']
 * produces a bug that survives testing — the row vanishes, the roster below it
 * on the same page does not update, and a reload fixes it. Nothing errors.
 *
 * Not optimistic, unlike leaving a team: accepting would need three coordinated
 * cache lies and a three-part rollback for a failure the server really does
 * return ("filled up first"), on an action taken twice a month.
 */
export function useRespondToMembership() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    // Passed as one object so every callback gets it as `variables` — that is
    // how onSuccess picks its wording and how list UIs know which row is busy.
    mutationFn: ({
      membershipId,
      action,
    }: {
      membershipId: string
      action: 'accept' | 'decline'
      /** Only used for the toast wording — 'invite' or 'request'. */
      kind?: 'invite' | 'request'
    }) => respondToMembership(membershipId, action),

    onSuccess: (_data, variables) => {
      // Both prefixes — see the note above.
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      // A player accepts an invite; a captain approves a request. One message
      // for both would read as wrong on one of the two screens.
      const accepted = variables.action === 'accept'
      const asCaptain = variables.kind === 'request'

      showToast(
        asCaptain
          ? accepted
            ? 'Player added to the squad'
            : 'Request rejected'
          : accepted
            ? 'You joined the team'
            : 'Invite declined'
      )
    },

    onError: (error) => {
      // e.g. "Kochi United filled up first" — an outcome the client cannot
      // predict, so only the server's wording is useful.
      showToast(error.message, 'error')
    },
  })
}
