import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'
import type { CreateTeamFormValues } from '../schemas'

/**
 * Create a team. Structurally identical to useCreateMatch — invalidate on
 * success, toast, navigate.
 *
 * ---- WHY NOT OPTIMISTIC, LIKE JOIN WAS? ----
 *
 * Worth being able to answer, because "we made joining optimistic, why not
 * creating?" is a fair follow-up.
 *
 * An optimistic update needs you to know what the result will look like before
 * the server answers. For a join you do: you know the player, and the roster is
 * right there in front of you. For a create you do NOT — the server assigns
 * the id. You would have to invent a fake one, render a team that does not
 * exist, then swap it for the real thing, and handle the user tapping your
 * fake team before the swap lands.
 *
 * All that to save 500ms on an action the user only takes once. Optimism is
 * for frequent, small, predictable changes. Creation is none of those.
 *
 * ---- THE NAVIGATION DIFFERENCE ----
 *
 * useCreateMatch sends you back to the list. Here we go to the NEW TEAM's page
 * instead, using the id the server just assigned. A team you just made is
 * empty and needs people invited to it, so the profile page is where you
 * actually want to be — matching docs/02-app-flow.md flow 5.
 */
export function useCreateTeam() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: CreateTeamFormValues) => createTeam(data),

    // `newTeam` is whatever mutationFn resolved to — the created team, with
    // its server-assigned id. This is the reason POST handlers return the
    // created resource instead of just "ok".
    onSuccess: (newTeam) => {
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      showToast('Team created')
      navigate(`/teams/${newTeam.id}`)
    },

    onError: (error) => {
      // Also rendered inline in the form — a toast that vanishes in 3.5s is
      // easy to miss, and "that name is taken" needs to stay on screen while
      // you think of another one.
      showToast(error.message, 'error')
    },
  })
}
