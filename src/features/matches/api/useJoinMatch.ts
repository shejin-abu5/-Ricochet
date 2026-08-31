import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { joinMatch, leaveMatch } from './matchesApi'
import { matchKeys } from './useMatches'
import { useAuthStore } from '../../auth/authStore'
import { useUiStore } from '../../../shared/uiStore'
import type { Match, MatchPlayer } from '../types'

/**
 * ============================================================
 *  OPTIMISTIC UPDATES — the core of Phase 2c
 * ============================================================
 *
 * THE PROBLEM WITH BEING HONEST
 *
 * The truthful way to handle "Join" is: send the request, show a spinner,
 * wait for the server, then update the screen. Correct, and it feels awful.
 * Our mock takes 900ms; a real phone on 4G is worse. Every tap costs a
 * second of nothing happening, and people tap again because they assume it
 * did not register.
 *
 * THE OPTIMISTIC BARGAIN
 *
 * Update the screen IMMEDIATELY, as though the server had already said yes.
 * Send the request in the background. If the server disagrees, put
 * everything back exactly as it was and tell the user.
 *
 * You are betting that the server will say yes. That bet is right ~99% of
 * the time, so you trade a rare, visible correction for a permanently fast
 * interface. Every "like" button you have ever pressed works this way.
 *
 * THE FOUR CALLBACKS
 *
 *   onMutate   — fires BEFORE the request. Do the lying here, and return a
 *                snapshot of the truth so you can undo it.
 *   onError    — the bet lost. Restore the snapshot.
 *   onSuccess  — the bet won. Replace your guess with the server's answer.
 *   onSettled  — runs either way. Refetch, so the cache ends up matching
 *                reality no matter which branch ran.
 *
 * Whatever `onMutate` RETURNS is handed to the other three as `context`.
 * That is the whole mechanism: onMutate hides the old value in context, and
 * onError pulls it back out.
 *
 * WHY OPTIMISTIC UPDATES ARE THE HARD PART
 *
 * Anyone can call a mutation. Optimistic updates make you deal with the fact
 * that your UI and the server are now two copies of the truth that can
 * disagree — cancelling in-flight requests, rolling back, reconciling. It is
 * the smallest realistic version of distributed-state thinking, which is why
 * it deserves the ceremony above.
 */

/** A function that takes a match and returns a NEW, changed match. */
type MatchUpdater = (match: Match) => Match

/**
 * ---- WHY THIS HELPER EXISTS ----
 *
 * The same match is cached in more than one place at once:
 *
 *   ['matches','detail','m3']              ← the page you are looking at
 *   ['matches','list',{}]                  ← the unfiltered Discover list
 *   ['matches','list',{format:'5v5'}]      ← and every other filter you tried
 *
 * Patch only the detail entry and the roster updates while the card behind it
 * still says "8 / 10". Users notice that instantly.
 *
 * `setQueriesData` (PLURAL) is the tool: it prefix-matches, exactly like
 * invalidateQueries, so one call reaches every cached list at once.
 *
 * This is also the concrete reason we are not using React 19's `useOptimistic`
 * here. `useOptimistic` holds its optimistic value inside ONE component — it
 * has no idea the query cache exists, so it cannot touch those list entries.
 * (See docs/07 for the full comparison.)
 */
function patchMatchEverywhere(
  queryClient: QueryClient,
  matchId: string,
  update: MatchUpdater
) {
  // The detail entry — a single match, or undefined if the page was never opened.
  queryClient.setQueryData<Match>(matchKeys.detail(matchId), (old) =>
    old ? update(old) : old
  )

  // Every list entry — arrays of matches. Find ours by id, leave the rest alone.
  queryClient.setQueriesData<Match[]>({ queryKey: ['matches', 'list'] }, (old) =>
    old?.map((m) => (m.id === matchId ? update(m) : m))
  )
}

/**
 * Take a copy of everything we are about to change, so onError can put it back.
 *
 * `getQueriesData` returns pairs of [key, data] for every entry matching the
 * prefix — which is exactly what we need to restore them one by one later.
 */
function snapshotMatchCaches(queryClient: QueryClient, matchId: string) {
  return {
    detail: queryClient.getQueryData<Match>(matchKeys.detail(matchId)),
    lists: queryClient.getQueriesData<Match[]>({ queryKey: ['matches', 'list'] }),
  }
}

type MatchSnapshot = ReturnType<typeof snapshotMatchCaches>

/**
 * Put every cache entry back exactly as it was before we started lying.
 *
 * Note we restore the EXACT previous values rather than trying to reverse the
 * change (e.g. "remove the player we added"). Reversing is fragile: if the
 * cache changed for some other reason while the request was in flight, your
 * reverse operation is now wrong. Snapshot-and-restore cannot drift.
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
 * Everything the join and leave mutations share. They differ in exactly three
 * ways — which request to send, how to change the match, and what to say when
 * it works — so those are the three parameters.
 *
 * Writing this twice would have been fine too. It was worth extracting only
 * because the optimistic dance below is genuinely intricate: two copies of it
 * would drift apart the first time either was edited.
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

  // A selector, as always — this hook re-renders its component only when the
  // user object itself changes, not on every unrelated auth-store write.
  const user = useAuthStore((state) => state.user)

  return useMutation({
    mutationFn: () => request(matchId),

    /**
     * STEP 1 — onMutate. Runs BEFORE the request leaves the browser.
     */
    onMutate: async () => {
      // A guest has nothing to add to the roster. Skip the optimistic step and
      // let the server's 401 come back normally. Returning undefined here means
      // `context` is undefined in onError, which is exactly what we check for.
      if (!user) return

      /**
       * 1a. CANCEL IN-FLIGHT REFETCHES — the step everyone forgets.
       *
       * Suppose a background refetch of the match list started 200ms ago and
       * is still in the air. You write your optimistic change to the cache…
       * and then that older response arrives and overwrites it with data from
       * before you joined. Your name flickers in and straight back out, with
       * no error, and nothing in the code looks wrong.
       *
       * cancelQueries throws away any request already in flight for these
       * keys. `await` matters: we must not touch the cache until they are gone.
       */
      await queryClient.cancelQueries({ queryKey: matchKeys.all })

      // 1b. Snapshot the truth, so onError can restore it.
      const snapshot = snapshotMatchCaches(queryClient, matchId)

      // 1c. Lie. This is the part the user sees, and it happens in the same
      // frame as the click — no network involved, so it is instant.
      patchMatchEverywhere(queryClient, matchId, optimisticUpdate(user))

      // 1d. Hand the snapshot to the other callbacks as `context`.
      return snapshot
    },

    /**
     * STEP 2a — the bet lost. Undo everything and explain why.
     */
    onError: (error, _variables, context) => {
      // `context` is undefined when onMutate bailed out early (the guest case),
      // and TypeScript makes us check — there is nothing to roll back then.
      if (context) {
        restoreMatchCaches(queryClient, matchId, context)
      }

      // The server's own message, e.g. "Too slow — someone just took the last
      // spot". Without this the rollback is baffling: things move on screen
      // for no stated reason, which reads as a bug rather than a race.
      showToast(error.message, 'error')
    },

    /**
     * STEP 2b — the bet won. Replace our guess with the server's answer.
     *
     * Our optimistic version and the server's usually match, but not always:
     * someone else may have joined in the same second, so the real player
     * count could be higher than we predicted. The server is the authority,
     * so we take its object wholesale.
     */
    onSuccess: (serverMatch) => {
      patchMatchEverywhere(queryClient, matchId, () => serverMatch)
      showToast(successMessage)
    },

    /**
     * STEP 3 — onSettled runs after BOTH branches.
     *
     * The safety net. Whatever just happened — success, rollback, a bug in the
     * patching logic above — this refetches from the server and the cache ends
     * up matching reality. Optimistic UI is a guess; this is the line that
     * guarantees the guess is never load-bearing for more than a second.
     */
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: matchKeys.all })
    },
  })
}

/**
 * Join a match. Adds you to the roster on screen instantly.
 *
 * Note both updaters return a NEW object with `...spread` rather than pushing
 * into `match.players`. Mutating cached objects is a real bug, not a style
 * preference: React compares by reference to decide what to re-render, so a
 * mutated array is `===` to itself and the screen simply does not update.
 */
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

/** Leave a match. The exact mirror image. */
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
