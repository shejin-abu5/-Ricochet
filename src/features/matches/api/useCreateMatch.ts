import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { createMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useUiStore } from '../../../shared/uiStore'
import type { CreateMatchFormValues } from '../schemas'

/**
 * ============================================================
 *  CACHE INVALIDATION — the new idea in this phase
 * ============================================================
 *
 * THE PROBLEM:
 * You just created a match. TanStack Query is still holding the match lists
 * it fetched a minute ago — and none of them know about your new match. Send
 * the user back to the list and they'd see stale data and think it failed.
 *
 * THE FIX:
 *   queryClient.invalidateQueries({ queryKey: matchKeys.all })
 *
 * That means: "every cache entry whose label STARTS WITH ['matches'] is now
 * out of date. Mark it stale, and refetch any that a component is currently
 * showing."
 *
 * PREFIX MATCHING is the part worth understanding. matchKeys.all is just
 * ['matches'], and Query matches keys by prefix, so ONE call invalidates
 * every list at once:
 *
 *   ['matches','list',{format:'5v5'}]        ← invalidated
 *   ['matches','list',{format:'7v7',q:'turf'}] ← invalidated
 *   ['matches','list',{}]                     ← invalidated
 *   ['teams', ...]                            ← untouched
 *
 * That's exactly why useMatches.ts defines keys as a factory with a shared
 * ['matches'] prefix rather than ad-hoc arrays. The structure of your keys
 * IS your invalidation strategy.
 *
 * WHY NOT JUST WRITE THE NEW MATCH INTO THE CACHE BY HAND?
 * You can (setQueryData), but you'd have to know where it belongs in every
 * cached list, respecting each one's filters and sort order. Invalidating
 * and letting the server re-answer is simpler and can't drift out of sync.
 * The trade is one extra request.
 */
export function useCreateMatch() {
  const navigate = useNavigate()

  // The same QueryClient created in app/queryClient.ts and handed to
  // <QueryClientProvider> in main.tsx. This hook reaches it through context —
  // which is why that provider has to wrap the app.
  const queryClient = useQueryClient()

  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: CreateMatchFormValues) => createMatch(data),

    onSuccess: () => {
      // Order matters a little: invalidate BEFORE navigating, so the list is
      // already refetching by the time it mounts and shows fresh data sooner.
      queryClient.invalidateQueries({ queryKey: matchKeys.all })

      showToast('Match created')
      navigate('/')
    },

    onError: (error) => {
      // Unlike the auth forms (which render mutation.error inline), a toast
      // works here too — but we ALSO surface it in the form, since an error
      // that only appears for 3.5 seconds is easy to miss.
      showToast(error.message, 'error')
    },
  })
}
