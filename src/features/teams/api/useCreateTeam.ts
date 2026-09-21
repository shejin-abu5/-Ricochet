import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'
import type { CreateTeamFormValues } from '../schemas'

/**
 * Creates a team, then navigates to its profile page.
 *
 * Not optimistic: an optimistic update needs to know the result in advance, and
 * the server assigns the id here. Faking one means rendering a team that does
 * not exist and handling a tap on it before the swap lands — a lot of work to
 * save 500ms on a once-per-team action.
 *
 * Unlike useCreateMatch this navigates to the new team rather than the list: a
 * team you just made is empty and needs people invited (docs/02 flow 5).
 */
export function useCreateTeam() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: CreateTeamFormValues) => createTeam(data),

    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      showToast('Team created')
      navigate(`/teams/${newTeam.id}`)
    },

    onError: (error) => {
      // Also rendered inline in the form: "that name is taken" needs to stay up
      // while the user thinks of another one.
      showToast(error.message, 'error')
    },
  })
}
