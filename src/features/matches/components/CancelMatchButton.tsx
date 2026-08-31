import { useState } from 'react'
import { Button } from '../../../shared/components/Button'
import { Modal } from '../../../shared/components/Modal'
import { useAuthStore } from '../../auth/authStore'
import { useCancelMatch } from '../api/useCancelMatch'
import type { Match } from '../types'

interface CancelMatchButtonProps {
  match: Match
}

/**
 * The host's "call it off" control, plus the confirmation it opens.
 *
 * ---- WHY THIS IS ITS OWN COMPONENT ----
 *
 * Same reasoning as JoinMatchButton.tsx: MatchDetailPage is already a long
 * file about LAYOUT, and this is a self-contained lump of behaviour — a
 * permission check, a piece of local UI state, a mutation and a dialog. Bolting
 * it inline would mix the two concerns in one component.
 *
 * ---- THE ONE useState IN THIS FEATURE, AND WHY IT'S LEGITIMATE ----
 *
 * docs/02-app-flow.md is strict about which layer state belongs to, and this
 * project has been strict about deriving rather than storing. So it's worth
 * naming why `isConfirmOpen` is genuinely local state and not a violation:
 *
 *   It is not server data      no API can tell you whether a dialog is open
 *   It is not global           nothing outside this component needs to know
 *   It cannot be derived       there is no other value it's a function of
 *
 * That's the test. Compare with `isHost` two lines below it, which IS derived
 * and therefore is not stored. (Toasts, by contrast, live in a Zustand store —
 * because the component that fires one is never the component that draws it.
 * A dialog is drawn by the thing that opens it, so it stays local.)
 */
export function CancelMatchButton({ match }: CancelMatchButtonProps) {
  const user = useAuthStore((state) => state.user)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const cancel = useCancelMatch(match.id)

  /**
   * Every hook above runs unconditionally, BEFORE this early return. React
   * requires hooks to be called in the same order on every render, so an early
   * return placed above them would break the rules of hooks the first time a
   * guest viewed the page. "Hooks first, branches second" is the habit.
   *
   * Derived, not stored — `isHost` recomputes itself if the user logs out.
   */
  const isHost = user?.id === match.creatorId
  if (!isHost) return null

  const handleConfirm = () => {
    /**
     * mutate() takes its own callbacks, and they run IN ADDITION to the ones
     * declared in useCancelMatch — not instead of them. The split is about
     * ownership: the hook owns what is true for every caller (patch the cache,
     * toast, invalidate), and the caller owns what is true only here (close my
     * dialog).
     *
     * Worth knowing the catch: these per-call callbacks are skipped if the
     * component unmounts before the request settles, whereas the hook's always
     * run. So anything that MUST happen belongs in the hook.
     */
    cancel.mutate(undefined, {
      onSuccess: () => setIsConfirmOpen(false),
    })
  }

  const joinedCount = match.playerCount

  return (
    <>
      {/**
       * `ghost`, not `danger`. The destructive styling belongs on the button
       * that actually destroys something — the one inside the dialog. Making
       * the opener red too means the page shouts about an action the host
       * takes once, and it competes with Join, which is the thing this screen
       * is actually for.
       *
       * The rule: escalate the visual weight at the point of no return, not
       * before it.
       */}
      <Button variant="ghost" size="sm" onClick={() => setIsConfirmOpen(true)}>
        Cancel match
      </Button>

      <Modal
        open={isConfirmOpen}
        // Refuse to close mid-request. Letting the dialog vanish while the
        // mutation is in flight leaves the user with no idea whether it worked.
        onClose={() => {
          if (!cancel.isPending) setIsConfirmOpen(false)
        }}
        title="Cancel this match?"
        description={
          joinedCount > 0
            ? `${joinedCount} ${joinedCount === 1 ? 'player has' : 'players have'} joined. They'll see it as cancelled.`
            : 'Nobody has joined yet.'
        }
        footer={
          <>
            {/* Source order matters: the safe option comes FIRST so it is what
                Tab reaches first, and the native <dialog> gives it initial
                focus. A confirmation whose destructive button is focused on
                open is one stray Enter away from a mistake. */}
            <Button
              variant="secondary"
              onClick={() => setIsConfirmOpen(false)}
              disabled={cancel.isPending}
            >
              Keep it
            </Button>
            <Button variant="danger" isLoading={cancel.isPending} onClick={handleConfirm}>
              Cancel match
            </Button>
          </>
        }
      >
        <p className="text-meta text-content-muted">
          {/* Say plainly that it's one-way. "Are you sure?" tells someone
              nothing they didn't already know; "this cannot be undone" tells
              them the thing they actually need in order to decide. */}
          This can't be undone. The match stays visible to everyone who joined,
          marked as cancelled.
        </p>
      </Modal>
    </>
  )
}
