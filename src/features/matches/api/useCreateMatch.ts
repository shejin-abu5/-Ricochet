import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useUiStore } from '../../../shared/uiStore'
import type { CreateMatchFormValues } from '../schemas'

export function useCreateMatch() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: CreateMatchFormValues) => createMatch(data),

    onSuccess: () => {
      // Invalidating the ['matches'] prefix drops every cached list at once, so
      // the new match appears whatever filters were last used. Writing it into
      // each list by hand (setQueryData) would mean re-implementing every
      // list's filter and sort rules on the client.
      //
      // Invalidate before navigating so the list is already refetching by the
      // time it mounts.
      queryClient.invalidateQueries({ queryKey: matchKeys.all })

      showToast('Match created')
      navigate('/')
    },

    onError: (error) => {
      showToast(error.message, 'error')
    },
  })
}
