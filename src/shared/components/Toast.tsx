import { X } from '@phosphor-icons/react'
import { useUiStore } from '../uiStore'

/**
 * Renders every toast in the uiStore. Mounted once, in Layout.
 *
 * The indirection is why toasts are global state: the component that causes one
 * (a form, deep in the tree) is never the one that draws it.
 */
export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  // Nothing, rather than an empty fixed-position container sitting invisibly
  // over the page.
  if (toasts.length === 0) return null

  return (
    // aria-live announces new toasts without interrupting what is being read;
    // without it a toast is invisible to anyone not watching the screen.
    <div
      aria-live="polite"
      // bottom-20 clears the mobile tab bar; on desktop the nav is elsewhere.
      className="fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 lg:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          // Tinted surfaces, not solid fills: a toast arrives unannounced in
          // peripheral vision, and a slab of #d2ff00 there is startling rather
          // than informative. The border is what stops a low-opacity fill
          // reading as a smudge on the page behind it.
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
            // Negative margin extends the hit area to 44px without visually
            // bloating the toast.
            className="-m-2 shrink-0 p-2 opacity-70 transition-opacity hover:opacity-100"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
      ))}
    </div>
  )
}
