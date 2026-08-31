import { X } from '@phosphor-icons/react'
import { useUiStore } from '../uiStore'

/**
 * Renders every toast currently in the uiStore. Mounted ONCE, in Layout.tsx,
 * so any component anywhere can trigger a toast without rendering one itself:
 *
 *   useUiStore.getState().showToast('Match created')
 *
 * That indirection is the whole reason the toast list is global state rather
 * than local state — the component that CAUSES a toast (a form, deep in the
 * tree) is not the component that DRAWS it (this one, near the root).
 */
export function ToastViewport() {
  // Selector, as always — this component re-renders only when `toasts`
  // changes, never when some other part of the UI store does.
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  // Render nothing at all when there's nothing to show, rather than an
  // empty fixed-position container sitting invisibly over the page.
  if (toasts.length === 0) return null

  return (
    // aria-live="polite" tells screen readers to announce new toasts when
    // they appear, without interrupting whatever is being read. Without it,
    // a toast is invisible to anyone not looking at the screen.
    <div
      aria-live="polite"
      // bottom-20 clears the mobile tab bar; on desktop the sidebar is to the
      // left so there's nothing to avoid. z-50 sits above page content but
      // below any future modal.
      className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          /**
           * Both variants are tinted surfaces with a matching border, not solid
           * fills. A toast appears unannounced, on top of whatever you were
           * reading — a solid slab of #d2ff00 arriving in your peripheral
           * vision is startling rather than informative.
           *
           * The border is what makes a low-opacity fill read as a distinct
           * object rather than a smudge on the page behind it.
           */
          className={`flex w-full max-w-sm items-center justify-between gap-3 rounded-control border px-4 py-3 text-meta ${
            toast.variant === 'error'
              ? 'border-danger/40 bg-danger-surface text-danger'
              : 'border-primary/30 bg-primary/10 text-primary'
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            // A real 44px tap target, hit area extended with negative margin so
            // the × doesn't visually bloat the toast.
            className="-m-2 shrink-0 p-2 opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  )
}
