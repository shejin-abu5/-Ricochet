import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'
import type { UpdateTeamFormValues } from '../schemas'

/**
 * Saves team settings.
 *
 * Invalidates the whole ['teams'] prefix, since cards show name, location and
 * badge colour. Deliberately NOT ['invites']: invite rows embed teamName and
 * teamColour, so one sent before a rename carries the old name until refetched.
 * That is cosmetic and self-correcting, and refetching a list nobody is looking
 * at to fix a label nobody has noticed is not worth the round trip.
 */
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: UpdateTeamFormValues) => updateTeam(teamId, data),

    onSuccess: (updatedTeam) => {
      // Seed the detail cache before invalidating: the refetch costs another
      // round trip, during which the screen would still show the old name.
      queryClient.setQueryData(teamKeys.detail(teamId), updatedTeam)
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      showToast('Team updated')
    },

    onError: (error) => {
      showToast(error.message, 'error')
    },
  })
}
