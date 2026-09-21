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
 * The host's "call it off" control and its confirmation dialog.
 *
 * `isConfirmOpen` is local rather than in the UI store because the component
 * that opens the dialog is the one that draws it. Toasts go in Zustand for the
 * opposite reason — whatever fires one never renders it.
 */
export function CancelMatchButton({ match }: CancelMatchButtonProps) {
  const user = useAuthStore((state) => state.user)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const cancel = useCancelMatch(match.id)

  // Every hook above runs before this early return, so a guest viewing the page
  // doesn't change the hook order.
  const isHost = user?.id === match.creatorId
  if (!isHost) return null

  const handleConfirm = () => {
    // These callbacks run in addition to the hook's, not instead of them: the
    // hook owns what's true for every caller (cache, toast, invalidation), the
    // caller owns what's only true here.
    //
    // Per-call callbacks are skipped if the component unmounts before the
    // request settles, so anything that must happen belongs in the hook.
    cancel.mutate(undefined, {
      onSuccess: () => setIsConfirmOpen(false),
    })
  }

  const joinedCount = match.playerCount

  return (
    <>
      {/* Ghost, not danger: the destructive styling belongs on the button that
          actually destroys something. A red opener also competes with Join,
          which is what this screen is for. */}
      <Button variant="ghost" size="sm" onClick={() => setIsConfirmOpen(true)}>
        Cancel match
      </Button>

      <Modal
        open={isConfirmOpen}
        // Refuse to close mid-request, or the user is left not knowing whether
        // the cancellation went through.
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
            {/* The safe option comes first in source order, so it's what Tab
                reaches first and what <dialog> focuses on open — a confirmation
                focused on its destructive button is one stray Enter from a
                mistake. */}
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
          This can't be undone. The match stays visible to everyone who joined,
          marked as cancelled.
        </p>
      </Modal>
    </>
  )
}
