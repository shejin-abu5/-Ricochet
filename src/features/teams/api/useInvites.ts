import { useQuery } from '@tanstack/react-query'
import { fetchJoinRequests, fetchMyInvites, searchUsers } from './invitesApi'
import { useAuthStore } from '../../auth/authStore'

/**
 * Invites get their own prefix rather than living under ['teams']: different
 * entity, different lifecycle, and the inbox should not refetch every time a
 * team changes.
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
 * The caller's pending invites. Powers both the inbox page and the count badge,
 * which share one cache entry rather than fetching twice.
 *
 * The badge count is derived (`invites?.length ?? 0`) rather than mirrored into
 * Zustand — a hand-maintained copy goes wrong the first time someone accepts an
 * invite in another tab. See docs/02 flow 8.
 */
export function useMyInvites() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: inviteKeys.mine(),
    queryFn: fetchMyInvites,

    // Stops a logged-out visitor firing a request that can only return 401.
    enabled: isAuthenticated,
  })
}

/**
 * Join requests waiting on a captain's approval, for one team.
 *
 * The endpoint 403s non-captains. The calling panel only renders for the
 * captain, but that is a rule about the current render while a query fires from
 * an effect — passing `enabled` puts the precondition at the data layer, where a
 * refactor that moves the panel cannot quietly start firing 403s.
 */
export function useJoinRequests(teamId: string, enabled: boolean) {
  return useQuery({
    // teamId is IN the key — two teams' queues must not share a cache entry.
    queryKey: inviteKeys.requests(teamId),
    queryFn: () => fetchJoinRequests(teamId),
    enabled,
  })
}

/** Search users to invite to a team. */
export function useUserSearch(teamId: string, q: string) {
  const trimmed = q.trim()

  return useQuery({
    // `q` must be in the key, or every search reuses the first result and the
    // box appears broken.
    queryKey: inviteKeys.userSearch(teamId, trimmed),
    queryFn: () => searchUsers(trimmed, teamId),

    // Don't fire a request for an empty box, or for a single letter that
    // matches half the table. Two characters is a reasonable floor.
    enabled: trimmed.length >= 2,

    // Results do not meaningfully change within the few seconds spent picking a
    // name, and the default staleTime of 0 would make the picker flicker on
    // every remount.
    staleTime: 30_000,
  })
}
