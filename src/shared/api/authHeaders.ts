import { useAuthStore } from '../../features/auth/authStore'

/**
 * ============================================================
 *  READING A ZUSTAND STORE OUTSIDE REACT
 * ============================================================
 *
 * Everywhere else in this app you read the auth store with a HOOK:
 *
 *   const token = useAuthStore((state) => state.token)   // inside a component
 *
 * You cannot do that here. Hooks only work inside React components and other
 * hooks — this is a plain async function called from a fetch. Calling
 * useAuthStore() here would crash with "invalid hook call".
 *
 * `useAuthStore.getState()` is the escape hatch. It reads the store's current
 * value ONCE, right now, with no subscription attached.
 *
 * THE TRADE-OFF WORTH KNOWING:
 *   useAuthStore(selector)      → subscribes. Component re-renders on change.
 *   useAuthStore.getState()     → a snapshot. Nothing re-renders. Ever.
 *
 * A snapshot is exactly right here, because a fetch happens at one moment in
 * time — there is nothing to re-render. It would be exactly WRONG in a
 * component, where using getState() means the UI silently stops updating when
 * the value changes. That bug is invisible until someone logs out and the old
 * name is still sitting in the nav bar.
 *
 * (Zustand's escape hatch is unusually clean. The Redux equivalent is
 * importing the store object and calling store.getState() — same idea, and
 * the same trap of accidentally using it inside a component.)
 */
export function authHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token

  // No token = no header. Sending `Authorization: Bearer null` would be worse
  // than sending nothing: the server would try to look up a user called
  // "null" instead of cleanly seeing an unauthenticated request.
  if (!token) return {}

  // "Bearer" is the standard scheme name for token auth (RFC 6750). The
  // server splits on it in getUserFromRequest() in mocks/handlers.ts.
  return { Authorization: `Bearer ${token}` }
}
