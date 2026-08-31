import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendInvite } from './invitesApi'
import { inviteKeys } from './useInvites'
import { useUiStore } from '../../../shared/uiStore'

/**
 * Captain sends an invite.
 *
 * ---- WHICH CACHES DOES *THIS* ONE TOUCH? ----
 *
 * Same question as useRespondToInvite, different answer — and the difference
 * is worth sitting with.
 *
 * Sending an invite creates a pending invite. It does NOT change the roster:
 * nobody joins until they accept. So `['teams']` is untouched, and invalidating
 * it would fire pointless refetches of data that hasn't changed.
 *
 * What it DOES change is the search results, because each row carries an
 * `alreadyInvited` flag the server computed. Leave those cached and the person
 * you just invited still shows an enabled Invite button — click it again and
 * you get a 409 for a state your own screen was showing wrongly.
 *
 *   invalidate ['invites']  ✅  the search rows live under this prefix
 *   invalidate ['teams']    ❌  nothing about a team changed
 *
 * Invalidating everything after every mutation "works" and quietly turns a
 * caching library into a slow fetch-on-everything library.
 */
export function useSendInvite(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (userId: string) => sendInvite(teamId, userId),

    onSuccess: () => {
      // Covers inviteKeys.userSearch(...) — same ['invites'] prefix — so the
      // row the captain just invited comes back marked as invited.
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })
      showToast('Invite sent')
    },

    onError: (error) => {
      // Includes the 403 from the server when a non-captain tries this by
      // going around the UI: "Only the captain can invite players".
      showToast(error.message, 'error')
    },
  })
}
