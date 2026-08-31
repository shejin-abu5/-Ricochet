import { useMutation, useQueryClient } from '@tanstack/react-query'
import { respondToMembership } from './invitesApi'
import { inviteKeys } from './useInvites'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'

/**
 * ============================================================
 *  ONE MUTATION, TWO ENTITIES — and now, two directions
 * ============================================================
 *
 * (Was useRespondToInvite.ts. Renamed when join requests arrived: it answers
 * invites AND join requests now, and a name describing half of what a function
 * does is worse than no name, because it reads as correct.)
 *
 * THE CORE MECHANIC, UNCHANGED:
 *
 * Accepting changes TWO things on the server:
 *
 *   the MEMBERSHIP ROW  →  status pending → accepted, so it leaves the queue
 *   the TEAM            →  someone appears on the roster, memberCount goes up
 *
 * Invalidate only ['invites'] and you get a bug that survives testing:
 *
 *   1. Approve the request. It vanishes from the queue. Looks perfect.
 *   2. Look at the roster below it on the very same page.
 *   3. They are not there. Reload, and suddenly they are.
 *
 * Nothing errored. The mutation succeeded. The server is right. Only the
 * client's cached copy of a DIFFERENT entity was never told.
 *
 * > After writing a mutation, ask "what else on the server did this change?"
 * > — not "what did I fetch on this screen?"
 *
 * WHY THIS ONE IS NOT OPTIMISTIC, WHILE LEAVING A TEAM IS:
 *
 * Accepting optimistically would mean three coordinated lies — remove the row
 * from one cache, add a member to a roster in another, bump counts in the team
 * list — with a three-part rollback for a failure the server genuinely returns
 * ("filled up first"). The queue is not something people hammer; 800ms of
 * spinner is fine. Optimism costs complexity, so spend it where the
 * interaction is frequent, not where it happens twice a month.
 */
export function useRespondToMembership() {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    /**
     * Two arguments, so they travel as one object. Whatever you pass to
     * .mutate() shows up as `variables` in every callback — which is how
     * onSuccess below knows whether this was an accept or a decline, and how
     * the list UIs know which row is currently in flight.
     */
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
      // BOTH prefixes. This is the whole point of the file.
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      // Wording depends on which side you're on: a player ACCEPTS an invite,
      // a captain APPROVES a request. Same operation, different sentence —
      // using one message for both would read as wrong in one of the two.
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
      // e.g. "Kochi United filled up first" — a real outcome the client could
      // not have predicted, so the server's wording is the only useful one.
      showToast(error.message, 'error')
    },
  })
}
