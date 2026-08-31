import { create } from 'zustand'

/**
 * ============================================================
 *  A SECOND ZUSTAND STORE — and why it's separate
 * ============================================================
 *
 * Compare this file to features/auth/authStore.ts. Same library, same
 * create() call — but a completely different KIND of state:
 *
 *   authStore  — who you are. Long-lived. Persisted to localStorage so it
 *                survives a refresh. Losing it logs you out.
 *   uiStore    — ephemeral chrome. Lives for three seconds. Persisting it
 *                would be absurd: nobody wants yesterday's "Match created"
 *                toast reappearing when they open the app.
 *
 * Note there's NO persist middleware here. That's the point.
 *
 * WHY TWO SMALL STORES INSTEAD OF ONE BIG ONE:
 * This is where Zustand differs from Redux by convention. Redux teaches a
 * SINGLE store with slices inside it. Zustand encourages several small,
 * focused stores — a component that only shows toasts never subscribes to
 * auth state at all, so it can't be re-rendered by a login. Smaller stores
 * mean smaller blast radius.
 *
 * Both are defensible: Redux centralises by default, Zustand decentralises
 * by default. Which one fits depends on whether you want a single audited
 * place for every state change, or isolation between concerns.
 */

export type ToastVariant = 'success' | 'error'

export interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface UiState {
  toasts: Toast[]
  showToast: (message: string, variant?: ToastVariant) => void
  dismissToast: (id: string) => void
}

/** How long a toast stays on screen before removing itself. */
const TOAST_DURATION_MS = 3500

export const useUiStore = create<UiState>((set) => ({
  toasts: [],

  showToast: (message, variant = 'success') => {
    // crypto.randomUUID() is built into modern browsers — no library needed.
    // Each toast needs a stable unique id so React's `key` prop works and so
    // dismissTimer below knows exactly which one to remove.
    const id = crypto.randomUUID()

    // `set` can take a FUNCTION when the new value depends on the old one.
    // Writing set({ toasts: [...toasts, newToast] }) with a stale `toasts`
    // read from outside would drop toasts fired in quick succession.
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))

    // Auto-dismiss. A timer inside a store is a side effect, which purists
    // dislike — but the alternative (every component that shows a toast
    // remembering to clear it) is worse and easy to forget.
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  // Manual dismiss, for the × button on the toast itself.
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
