import { useQuery } from '@tanstack/react-query'
import { fetchMyProfile, fetchMyTeams } from './profileApi'
import { useAuthStore } from '../../auth/authStore'

export const profileKeys = {
  all: ['profile'] as const,
  me: () => ['profile', 'me'] as const,
  myTeams: () => ['profile', 'myTeams'] as const,
}

/**
 * The full profile — position, skill level, foot, location, attributes.
 *
 * Not folded into authStore at login, even though the store already holds
 * id/name/email. That store is persisted to localStorage and has no concept of
 * staleness, so profile data put there would survive a reload for weeks with
 * whatever it held at login and never refetch after an edit.
 *
 * The line is not "user data vs other data": it is whether the value comes from
 * an API and can go stale. Session in Zustand, profile in Query.
 */
export function useMyProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: fetchMyProfile,
    // Meaningless without a token — this could only ever 401.
    enabled: isAuthenticated,
  })
}

/**
 * The caller's teams. A separate query rather than part of the profile payload:
 *
 * 1. They change for different reasons — accepting an invite changes your teams
 *    and not your profile — so each can be invalidated on its own.
 * 2. They load independently, which is why the profile page has per-section
 *    loading rather than one skeleton over everything.
 */
export function useMyTeams() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: profileKeys.myTeams(),
    queryFn: fetchMyTeams,
    enabled: isAuthenticated,
  })
}
