import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendInvite } from './invitesApi'
import { inviteKeys } from './useInvites'
import { useUiStore } from '../../../shared/uiStore'

/**
 * Captain sends an invite.
 *
 * Invalidates ['invites'] but deliberately not ['teams']: sending an invite
 * creates a pending row, it does not change the roster until someone accepts.
 *
 * The invites prefix matters because search rows carry a server-computed
 * `alreadyInvited` flag — leave those cached and the person just invited still
 * shows an enabled Invite button, which 409s on the second click.
 */
export function useSendInvite(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (userId: string) => sendInvite(teamId, userId),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inviteKeys.all })
      showToast('Invite sent')
    },

    onError: (error) => {
      // Includes the server's 403 when a non-captain goes around the UI.
      showToast(error.message, 'error')
    },
  })
}
