import { create } from 'zustand'

/**
 * Ephemeral UI chrome — currently just toasts.
 *
 * Separate from authStore, and deliberately without `persist`: a toast lives
 * for three seconds, and nobody wants yesterday's "Match created" reappearing
 * on launch.
 *
 * Several small stores rather than one, so a component that only shows toasts
 * never subscribes to auth state and cannot be re-rendered by a login.
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
    const id = crypto.randomUUID()

    // Updater form, not set({ toasts: [...toasts, next] }): a stale read would
    // drop toasts fired in quick succession.
    set((state) => ({ toasts: [...state.toasts, { id, message, variant }] }))

    // A timer in a store is a side effect, but the alternative is every caller
    // remembering to clear its own toast.
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    }, TOAST_DURATION_MS)
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))
