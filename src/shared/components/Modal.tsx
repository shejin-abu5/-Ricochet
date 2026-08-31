import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from '@phosphor-icons/react'

/**
 * ============================================================
 *  MODAL — built on the native <dialog>, not a div
 * ============================================================
 *
 * A modal has four requirements that are easy to name and famously easy to get
 * wrong:
 *
 *   1. FOCUS TRAP     Tab must not escape into the page behind it. Without
 *                     this, a keyboard user tabs "out" of a dialog they can
 *                     still see and starts operating controls they can't.
 *   2. ESCAPE closes
 *   3. SCROLL LOCK    the page behind must not scroll under the overlay
 *   4. FOCUS RETURN   when it closes, focus goes back to whatever opened it,
 *                     not to the top of the document
 *
 * ---- THE CHOICE: NATIVE <dialog> vs A HAND-ROLLED DIV ----
 *
 * The hand-rolled version is what most tutorials show: a fixed-position div, a
 * keydown listener for Escape, and a loop that collects every focusable child
 * so Tab can be wrapped manually. It is roughly 80 lines, and the focus-trap
 * loop is genuinely hard to get right (disabled elements, elements hidden by
 * CSS, `tabindex="-1"`, shadow DOM, iframes).
 *
 * `<dialog>` opened with `.showModal()` gives us 1, 2 and 4 from the browser,
 * correctly, for free — plus it renders in the TOP LAYER, which means it is
 * painted above everything regardless of z-index. That last part quietly kills
 * a whole class of bug: no amount of `z-50` on a div can beat a stacking
 * context created by a `transform` on some ancestor, and the browser's top
 * layer is not subject to stacking contexts at all.
 *
 * What it does NOT give us is 3 — scroll lock — so that is the one thing this
 * component still does by hand, below.
 *
 * The cost of the native element is that it is IMPERATIVE: you cannot render
 * `open={true}` and get a modal (the `open` ATTRIBUTE opens it non-modally,
 * with no backdrop and no focus trap — a real trap for the unwary). You have
 * to call `.showModal()` on the DOM node. That is what the ref and the effect
 * below are for, and it is the honest price of the trade.
 */

interface ModalProps {
  open: boolean
  /**
   * Called when the modal wants to close — Escape, the X, a backdrop click, or
   * the browser closing it for any other reason.
   *
   * The PARENT owns `open`; this component never closes itself. That is a
   * controlled component, the same contract as an <input value onChange>, and
   * it means the parent can refuse — e.g. keep the dialog open while a
   * mutation is still in flight.
   */
  onClose: () => void
  title: string
  /** Optional supporting line under the title. */
  description?: ReactNode
  children: ReactNode
  /**
   * The action row. A separate prop rather than part of `children` so every
   * modal in the app puts its buttons in the same place, with the same
   * alignment, without each caller re-deciding.
   */
  footer?: ReactNode
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  /**
   * useId gives a unique, stable, SSR-safe id per component instance. Two
   * modals on one page would otherwise both claim `id="modal-title"`, and
   * duplicate ids make `aria-labelledby` point at whichever the browser found
   * first — which is to say, a coin flip.
   */
  const titleId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (open) {
      // Guard: calling showModal() on an already-open dialog throws
      // InvalidStateError. Effects can re-run for reasons unrelated to `open`.
      if (!dialog.open) dialog.showModal()

      /**
       * SCROLL LOCK — the one requirement the platform doesn't cover.
       *
       * Without it, scrolling while a modal is up scrolls the page underneath,
       * which reads as a bug on desktop and is actively disorienting on a
       * phone (you dismiss the modal and you're somewhere else entirely).
       *
       * The cleanup below restores it. Note we restore to '' rather than to
       * 'visible' or a remembered value: '' removes the inline style entirely
       * and lets the stylesheet decide again, which is the only way to avoid
       * permanently pinning body overflow to whatever it happened to be the
       * first time a modal opened.
       */
      document.body.style.overflow = 'hidden'
    } else if (dialog.open) {
      dialog.close()
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  /**
   * The browser fires `close` for Escape and for `.close()`. Routing both back
   * through onClose keeps the parent's `open` state honest — otherwise Escape
   * would visually dismiss the dialog while the parent still believed it was
   * showing, and it would refuse to reopen.
   */
  const handleClose = () => {
    if (open) onClose()
  }

  /**
   * BACKDROP CLICK.
   *
   * The trick worth knowing: `::backdrop` is a pseudo-element of the <dialog>
   * itself, so clicking it fires a click whose `target` IS the dialog element.
   * Clicks on the actual content hit a child instead. So comparing target to
   * the dialog node distinguishes "clicked outside" from "clicked inside"
   * without measuring any coordinates.
   */
  const handleClick = (event: React.MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      onClick={handleClick}
      aria-labelledby={titleId}
      /**
       * The UA stylesheet gives <dialog> a white background, a solid border and
       * padding, so those are stripped here and the real surface is the inner
       * div.
       *
       * ---- `m-auto` IS LOAD-BEARING, AND THIS ONE BIT ME ----
       *
       * The browser centres a modal dialog with its own rule:
       *
       *   dialog:modal { inset: 0; margin: auto; }
       *
       * ...so in a plain HTML page you get centring for free and there is
       * nothing to write. But Tailwind's preflight resets margin on EVERY
       * element (`*, ::before, ::after, ::backdrop { margin: 0 }`), and that
       * reset beats the UA sheet. `margin: 0` inside an `inset: 0` box means
       * the dialog collapses into the top-left corner — which is exactly what
       * it did, on desktop and mobile both.
       *
       * So `m-auto` here is not tidying, it is putting back the one declaration
       * the CSS reset took away. Worth remembering as a general shape: a reset
       * that claims to only remove "defaults" also removes BEHAVIOUR that some
       * defaults were quietly providing.
       *
       * `backdrop:` is Tailwind's variant for the ::backdrop pseudo-element.
       * A tint of the canvas colour rather than plain black, so the overlay
       * belongs to the theme instead of greying it out.
       */
      className="m-auto max-h-[calc(100dvh-2rem)] border-none bg-transparent p-0 text-content backdrop:bg-canvas/80 backdrop:backdrop-blur-sm"
    >
      {/* w-[min(...)] rather than max-w-md: on a 375px phone this keeps a 1rem
          gutter on each side, and on desktop it stops at 28rem. One expression
          instead of a width plus a breakpoint. */}
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
            // Icon-only, so it MUST carry an accessible name — otherwise a
            // screen reader announces "button" and nothing else.
            aria-label="Close"
            className="-m-1 shrink-0 rounded-control p-2 text-content-muted transition-colors hover:bg-raised hover:text-content"
          >
            <X size={18} />
          </button>
        </div>

        {/* The body scrolls, not the dialog — so a long modal keeps its title
            and its action row visible while the middle moves. */}
        <div className="min-h-0 overflow-y-auto px-5 pb-5">{children}</div>

        {footer && (
          // flex-wrap-reverse: on a narrow screen the buttons stack, and the
          // PRIMARY one (last in source order) ends up on top, where a thumb
          // reaches it first. Reversing in CSS rather than in JSX keeps the DOM
          // order correct for keyboard and screen-reader users.
          <div className="flex flex-wrap-reverse justify-end gap-2 border-t border-border p-5">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  )
}
