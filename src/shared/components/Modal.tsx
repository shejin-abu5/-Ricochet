import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

/**
 * Modal built on the native <dialog>, opened with .showModal().
 *
 * The platform supplies the focus trap, Escape-to-close and focus return — all
 * three are hard to hand-roll correctly (disabled elements, tabindex="-1",
 * shadow DOM). It also renders in the top layer, which is not subject to
 * stacking contexts, so no ancestor `transform` can bury it the way it can bury
 * a z-50 div.
 *
 * Scroll lock is the one requirement it does not cover, handled below.
 *
 * The cost is that it is imperative: rendering `open` does not open a modal —
 * the `open` ATTRIBUTE opens it non-modally, with no backdrop and no focus
 * trap — so the ref and effect below call .showModal() explicitly.
 */

interface ModalProps {
  open: boolean
  /**
   * Called when the modal wants to close — Escape, the X, a backdrop click.
   *
   * The parent owns `open` and this never closes itself, so a caller can refuse
   * — e.g. keep the dialog up while a mutation is in flight.
   */
  onClose: () => void
  title: string
  /** Optional supporting line under the title. */
  description?: ReactNode
  children: ReactNode
  /** The action row, kept separate from children so every modal aligns alike. */
  footer?: ReactNode
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Per-instance, so two modals on one page cannot both claim the same id and
  // leave aria-labelledby pointing at whichever the browser found first.
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      // Guard: calling showModal() on an already-open dialog throws
      // InvalidStateError. Effects can re-run for reasons unrelated to `open`.
      if (!dialog.open) dialog.showModal()

      // Cleanup restores this to '' rather than 'visible': that removes the
      // inline style entirely and lets the stylesheet decide again, instead of
      // pinning body overflow to whatever it was when the first modal opened.
      document.body.style.overflow = 'hidden'
    } else if (dialog.open) {
      dialog.close()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  // The browser fires `close` for Escape too. Routing it back through onClose
  // keeps the parent's `open` honest — otherwise Escape dismisses the dialog
  // while the parent still thinks it is showing, and it refuses to reopen.
  const handleClose = () => {
    if (open) onClose()
  }

  // ::backdrop is a pseudo-element of the <dialog>, so a click on it targets
  // the dialog itself while a click on the content targets a child — which
  // separates outside from inside with no coordinate maths.
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={handleClick}
      aria-labelledby={titleId}
      /*
       * The UA stylesheet gives <dialog> a white background, border and
       * padding, stripped here so the inner div is the real surface.
       *
       * `m-auto` is load-bearing, not tidying. Browsers centre a modal with
       * `dialog:modal { inset: 0; margin: auto }`, but Tailwind's preflight
       * resets margin on every element and beats the UA sheet — `margin: 0`
       * inside an `inset: 0` box collapses the dialog into the top-left corner.
       * This puts back the declaration the reset removed.
       *
       * The backdrop is a tint of the canvas colour rather than plain black, so
       * the overlay belongs to the theme instead of greying it out.
       */
      className="m-auto max-h-[calc(100dvh-2rem)] border-none bg-transparent p-0 text-content backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      {/* One expression instead of a width plus a breakpoint: a 1rem gutter on
          a 375px phone, capped at 28rem on desktop. */}
      <div className="flex w-[min(28rem,calc(100vw-2rem))] flex-col rounded-card border border-border bg-surface">
        <div className="flex items-start justify-between gap-4 p-5">
          <div className="min-w-0">
            <h2 id={titleId} className="text-title text-content">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 text-meta text-content-muted">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            // Icon-only, so it needs an explicit name or it announces as
            // "button" and nothing else.
            aria-label="Close"
            className="-m-1 shrink-0 rounded-control p-2 text-content-muted transition-colors hover:bg-raised hover:text-content"
          >
            <X size={18} />
          </button>
        </div>

        {/* The body scrolls, not the dialog, so a long modal keeps its title and
            action row visible. */}
        <div className="min-h-0 overflow-y-auto px-5 pb-5">{children}</div>

        {footer && (
          // flex-wrap-reverse so the stacked buttons put the primary one (last
          // in source order) on top, within thumb reach. Reversing in CSS rather
          // than JSX keeps the DOM order right for keyboard and screen readers.
          <div className="flex flex-wrap-reverse justify-end gap-2 border-t border-border p-5">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
