import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { joinMatch, leaveMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useAuthStore } from '../../auth/authStore'
import { useUiStore } from '../../../shared/uiStore'
import type { Match, MatchPlayer } from '../types'

/**
 * Join / leave, applied optimistically.
 *
 * A spinner would be honest but slow: the mock takes 900ms and 4G is worse, so
 * every tap buys a second of nothing happening and people tap again. Instead
 * the cache is patched as though the server had already agreed, and rolled
 * back on the rare rejection.
 *
 * React 19's `useOptimistic` is deliberately not used here. It holds its value
 * inside one component and knows nothing about the query cache, so it cannot
 * reach the cached Discover lists this mutation also has to patch. See docs/07.
 */

type MatchUpdater = (match: Match) => Match

/**
 * Applies `update` to every cached copy of this match.
 *
 * The same match lives in the detail entry and in every filtered list that
 * happened to include it. Patching only the detail entry leaves the card behind
 * the modal still reading "8 / 10", which users spot immediately.
 *
 * setQueriesData (plural) prefix-matches, so one call covers every list.
 */
function patchMatchEverywhere(
  queryClient: QueryClient,
  matchId: string,
  update: MatchUpdater
) {
  queryClient.setQueryData<Match>(matchKeys.detail(matchId), (old) =>
    old ? update(old) : old
  )

  queryClient.setQueriesData<Match[]>({ queryKey: ['matches', 'list'] }, (old) =>
    old?.map((m) => (m.id === matchId ? update(m) : m))
  )
}

/** Captures every cache entry this mutation is about to touch, for rollback. */
function snapshotMatchCaches(queryClient: QueryClient, matchId: string) {
  return {
    detail: queryClient.getQueryData<Match>(matchKeys.detail(matchId)),
    lists: queryClient.getQueriesData<Match[]>({ queryKey: ['matches', 'list'] }),
  }
}

type MatchSnapshot = ReturnType<typeof snapshotMatchCaches>

/**
 * Restores the snapshot verbatim rather than reversing the change.
 *
 * Reversing ("remove the player we added") is fragile — if anything else wrote
 * to the cache while the request was in flight, the inverse is wrong.
 */
function restoreMatchCaches(
  queryClient: QueryClient,
  matchId: string,
  snapshot: MatchSnapshot
) {
  queryClient.setQueryData(matchKeys.detail(matchId), snapshot.detail)

  for (const [key, data] of snapshot.lists) {
    queryClient.setQueryData(key, data)
  }
}

/**
 * Shared optimistic machinery for join and leave, which differ only in the
 * request, the cache patch, and the success message.
 *
 * Extracted rather than duplicated because the rollback sequence is intricate
 * enough that two copies would drift the first time either was edited.
 */
function useMatchMembershipMutation({
  matchId,
  request,
  optimisticUpdate,
  successMessage,
}: {
  matchId: string
  request: (id: string) => Promise<Match>
  optimisticUpdate: (player: MatchPlayer) => MatchUpdater
  successMessage: string
}) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: () => request(matchId),

    onMutate: async () => {
      // A guest has nothing to add to the roster — skip the optimistic step and
      // let the server's 401 surface normally. Returning undefined is what
      // onError's `context` check keys off.
      if (!user) return

      // Cancel in-flight refetches first. A background refetch that started
      // before the click would otherwise land after the patch and overwrite it
      // with pre-join data — the user's name flickers in and out with no error.
      await queryClient.cancelQueries({ queryKey: matchKeys.all })

      const snapshot = snapshotMatchCaches(queryClient, matchId)

      patchMatchEverywhere(queryClient, matchId, optimisticUpdate(user))

      // Returned value arrives as `context` in onError / onSettled.
      return snapshot
    },

    onError: (error, _variables, context) => {
      if (context) {
        restoreMatchCaches(queryClient, matchId, context)
      }

      // Surfacing the server's message matters here: without it the rollback
      // reads as a bug rather than "someone took the last spot".
      showToast(error.message, 'error')
    },

    // Take the server's object wholesale — someone else may have joined in the
    // same second, so the real count can differ from the predicted one.
    onSuccess: (serverMatch) => {
      patchMatchEverywhere(queryClient, matchId, () => serverMatch)
      showToast(successMessage)
    },

    // Runs after both branches, so a bug in the patching above self-corrects
    // within a second instead of leaving a wrong cache behind.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

// Both updaters return new objects rather than mutating the cached match:
// React compares by reference, so a mutated array is === to itself and the
// screen never re-renders.
export function useJoinMatch(matchId: string) {
  return useMatchMembershipMutation({
    matchId,
    request: joinMatch,
    optimisticUpdate: (player) => (match) => ({
      ...match,
      players: [...match.players, player],
      playerCount: match.playerCount + 1,
    }),
    successMessage: 'You are in',
  })
}

export function useLeaveMatch(matchId: string) {
  return useMatchMembershipMutation({
    matchId,
    request: leaveMatch,
    optimisticUpdate: (player) => (match) => ({
      ...match,
      players: match.players.filter((p) => p.id !== player.id),
      playerCount: match.playerCount - 1,
    }),
    successMessage: 'You left the match',
  })
}
