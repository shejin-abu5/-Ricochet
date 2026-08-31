import { useQuery } from '@tanstack/react-query'
import { fetchJoinRequests, fetchMyInvites, searchUsers } from './invitesApi'
import { useAuthStore } from '../../auth/authStore'

/**
 * A third key tree, same shape as matchKeys and teamKeys.
 *
 * Invites get their OWN prefix rather than living under ['teams'] — they are a
 * different entity with a different lifecycle, and the inbox should not be
 * refetched every time a team changes. Key prefixes are how you draw those
 * lines, so draw them where the entities actually are.
 */
export const inviteKeys = {
  all: ['invites'] as const,
  /** Invites addressed to me — the /invites inbox. */
  mine: () => ['invites', 'mine'] as const,
  /** Join requests waiting on me as captain of one specific team. */
  requests: (teamId: string) => ['invites', 'requests', teamId] as const,
  userSearch: (teamId: string, q: string) => ['invites', 'userSearch', teamId, q] as const,
}

/**
 * My pending invites. Powers both the inbox page and the count badge.
 *
 * ---- ONE QUERY, TWO CONSUMERS, NO DUPLICATION ----
 *
 * The badge on the Teams page and the list on the inbox page call this same
 * hook. They do NOT fetch twice: identical query key, so the second caller
 * reads the cache the first one filled.
 *
 * This is the point docs/02-app-flow.md flow 8 makes about notification
 * counts. The instinct is to put the number in Zustand so the badge can read
 * it "cheaply". Don't — you'd then be maintaining a copy of server data by
 * hand, and it will be wrong the first time someone accepts an invite in
 * another tab. Derive it: `invites?.length ?? 0`.
 */
export function useMyInvites() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: inviteKeys.mine(),
    queryFn: fetchMyInvites,

    /**
     * ---- `enabled` — the new TanStack option this phase ----
     *
     * A query with `enabled: false` doesn't run and sits in a pending state.
     * Here it stops a logged-out visitor firing a request that can only ever
     * return 401 — the badge simply doesn't render for guests.
     *
     * The general rule: use `enabled` when the query is MEANINGLESS without
     * some precondition (no token, no id, no search text yet). Don't use it as
     * a way to "wait" for something — Query already handles that by refetching
     * when the key changes.
     */
    enabled: isAuthenticated,
  })
}

/**
 * The join requests waiting on a captain's approval, for ONE team.
 *
 * ---- WHY `enabled` MATTERS HERE MORE THAN USUAL ----
 *
 * This endpoint returns 403 to anyone who is not the captain. The panel that
 * calls it is only rendered for the captain — but "only rendered for" is a
 * rule about the CURRENT render, and a query fires from an effect.
 *
 * Passing `enabled: isCaptain` makes the precondition explicit at the data
 * layer instead of relying on a parent component's conditional to hold
 * forever. Cheap insurance against a refactor that moves the panel somewhere
 * less careful and starts firing 403s that nobody notices in the console.
 */
export function useJoinRequests(teamId: string, enabled: boolean) {
  return useQuery({
    // teamId is IN the key — two teams' queues must not share a cache entry.
    queryKey: inviteKeys.requests(teamId),
    queryFn: () => fetchJoinRequests(teamId),
    enabled,
  })
}

/**
 * Search users to invite to a team.
 *
 * Two options doing real work here.
 */
export function useUserSearch(teamId: string, q: string) {
  const trimmed = q.trim()

  return useQuery({
    // `q` is IN the key. Miss that and every search would reuse the first
    // result and the box would appear broken — the classic query-key bug from
    // Phase 2a, in a place it's easy to forget.
    queryKey: inviteKeys.userSearch(teamId, trimmed),
    queryFn: () => searchUsers(trimmed, teamId),

    // Don't fire a request for an empty box, or for a single letter that
    // matches half the table. Two characters is a reasonable floor.
    enabled: trimmed.length >= 2,

    /**
     * Search results go stale fast in principle, but not within the few
     * seconds someone spends picking a name — and refetching every time the
     * component remounts would make the picker flicker. 30s is a sensible
     * middle.
     *
     * `staleTime` = how long Query treats cached data as fresh enough to
     * serve WITHOUT a background refetch. It defaults to 0, which is why
     * everything else in this app refetches so eagerly.
     */
    staleTime: 30_000,
  })
}
