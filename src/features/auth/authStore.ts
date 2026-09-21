import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  setCredentials: (user: AuthUser, token: string) => void
  logout: () => void
}

// Session lives in a store of its own rather than a combined app store: it is
// the only slice that needs persisting, and keeping it separate means UI state
// changes never touch localStorage.
export const useAuthStore = create<AuthState>()(
  // Without `persist`, a page refresh drops the in-memory session and logs the
  // user out. Rehydration happens synchronously before first paint, so
  // ProtectedRoute can trust `isAuthenticated` on mount.
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setCredentials: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    { name: 'ricochet-auth' }
  )
)
