import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../../features/auth/authStore'

/**
 * Gates a route tree on the persisted session.
 *
 * Read with a selector so this re-renders only when `isAuthenticated` changes,
 * not on every auth store write.
 */
export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
