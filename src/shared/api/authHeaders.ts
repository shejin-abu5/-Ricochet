import { useAuthStore } from '../../features/auth/authStore'

/**
 * Authorization header for authenticated fetches.
 *
 * Uses `getState()` rather than the hook, because this is a plain function and
 * a hook call here would be an invalid hook call. getState() is a snapshot with
 * no subscription, which is right for a fetch that happens at one instant — and
 * exactly wrong inside a component, where it silently stops the UI updating.
 */
export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token

  // Omit the header entirely rather than sending "Bearer null", which the
  // server would try to resolve as a user instead of seeing no auth at all.
  if (!token) return {}

  return { Authorization: `Bearer ${token}` }
}
