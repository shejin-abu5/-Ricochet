import { useQuery } from '@tanstack/react-query'
import { fetchMyProfile, fetchMyTeams } from './profileApi'
import { useAuthStore } from '../../auth/authStore'

/**
 * A fourth key tree. Same shape as matchKeys, teamKeys and inviteKeys — by now
 * this should be boring, which is the whole point of a convention.
 */
export const profileKeys = {
  all: ['profile'] as const,
  me: () => ['profile', 'me'] as const,
  myTeams: () => ['profile', 'myTeams'] as const,
}

/**
 * ============================================================
 *  THE AUTH STORE ALREADY HAS A USER. WHY FETCH ANOTHER ONE?
 * ============================================================
 *
 * `useAuthStore` holds `{ id, name, email }` — enough to greet someone and to
 * check "is this me?". The profile page needs position, skill level, preferred
 * foot, location, attributes, joined date.
 *
 * The tempting shortcut is to stuff all of that into authStore at login, so
 * it's "already there". Don't. That would put SERVER DATA into a Zustand store
 * that is persisted to localStorage, which means:
 *
 *   - it goes stale the moment the profile is edited anywhere else, and nothing
 *     refetches it, because Zustand has no concept of staleness;
 *   - it survives a reload with whatever it held at login, possibly for weeks;
 *   - you now maintain two sources of truth for "who am I".
 *
 * The split this project follows (see CLAUDE.md and docs/00):
 *
 *   Zustand   SESSION — am I logged in, what's my token, what's my id/name.
 *             Client state. Doesn't go stale because it isn't a cache.
 *   Query     PROFILE — everything the server knows about me. Server state.
 *             Refetches, invalidates, can be shared between screens.
 *
 * The line is not "user data vs other data". It is: does this come from an API
 * and can it go stale? Then it belongs in Query, even when it's about you.
 */
export function useMyProfile() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: fetchMyProfile,
    // Meaningless without a token — don't fire a request that can only 401.
    enabled: isAuthenticated,
  })
}

/**
 * The teams I'm on.
 *
 * ---- A SEPARATE QUERY, NOT PART OF THE PROFILE ----
 *
 * These could have been one endpoint returning profile + teams together. Two
 * reasons they're separate:
 *
 *   1. They change for different reasons and at different rates. Accepting an
 *      invite changes your teams and not your profile; editing your position
 *      changes your profile and not your teams. Separate cache entries mean
 *      each can be invalidated on its own.
 *   2. They can LOAD INDEPENDENTLY. The overview and skills cards render as
 *      soon as the profile arrives, without waiting on the teams request.
 *
 * Point 2 is a real UI consequence of a caching decision, and it's why the
 * profile page has per-section loading rather than one skeleton over
 * everything: the page shows each part the moment that part is ready.
 */
export function useMyTeams() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  return useQuery({
    queryKey: profileKeys.myTeams(),
    queryFn: fetchMyTeams,
    enabled: isAuthenticated,
  })
}
