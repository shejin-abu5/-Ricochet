import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updateTeam } from './teamsApi'
import { teamKeys } from './useTeams'
import { useUiStore } from '../../../shared/uiStore'
import type { UpdateTeamFormValues } from '../schemas'

/**
 * Save team settings.
 *
 * ---- WHICH CACHES? ----
 *
 * Renaming a team or changing its colour affects the detail entry AND every
 * cached list row, since cards show the name, location and badge colour. So
 * the whole ['teams'] prefix goes.
 *
 * Not ['invites'], though — and that one is genuinely arguable. The invite
 * rows the server returns EMBED `teamName` and `teamColour` (see docs/09,
 * "normalise your writes, denormalise your reads"), so an invite sent before a
 * rename carries the old name until it's refetched.
 *
 * We accept that: a stale team name on an invite card is cosmetic and corrects
 * itself the next time the inbox loads. Invalidating ['invites'] on every
 * settings save would refetch a list nobody is looking at, to fix a label
 * nobody has noticed. Correctness of DATA matters; instant consistency of a
 * DENORMALISED COPY usually doesn't.
 *
 * Being able to say *why* you chose not to invalidate something is a better
 * signal than invalidating everything by reflex.
 */
export function useUpdateTeam(teamId: string) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: UpdateTeamFormValues) => updateTeam(teamId, data),

    onSuccess: (updatedTeam) => {
      /**
       * Write the server's response straight into the detail cache BEFORE
       * invalidating. `invalidateQueries` triggers a refetch, which takes
       * another round trip — during which the screen would still show the old
       * name. Seeding the cache first means the new name appears instantly and
       * the refetch just confirms it.
       *
       * Not an optimistic update: this is the server's actual answer, after it
       * arrived. No guessing, nothing to roll back.
       */
      queryClient.setQueryData(teamKeys.detail(teamId), updatedTeam)
      queryClient.invalidateQueries({ queryKey: teamKeys.all })

      showToast('Team updated')
    },

    onError: (error) => {
      // e.g. "A team with that name already exists" — only the server knows.
      showToast(error.message, 'error')
    },
  })
}
