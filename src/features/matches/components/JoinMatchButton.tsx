import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useJoinMatch, useLeaveMatch } from '../api/useJoinMatch'
import type { Match } from '../types'

interface JoinMatchButtonProps {
  match: Match
}

/**
 * The match's membership control, which resolves to one of five states:
 * log-in link, leave, full (disabled), busy, or join.
 *
 * Membership is derived from the roster rather than stored, so the optimistic
 * update in useJoinMatch flips this to "Leave" the moment it patches the cache
 * — no second piece of state to keep in sync.
 *
 * Sizing is left to the caller (Button is inline-flex); a `w-full` baked in
 * here would have to be fought with overrides wherever it doesn't apply.
 */
export function JoinMatchButton({ match }: JoinMatchButtonProps) {
  const user = useAuthStore((state) => state.user)

  // Both mutations are created unconditionally to satisfy the rules of hooks.
  // Creating one is cheap — nothing runs until .mutate().
  const join = useJoinMatch(match.id)
  const leave = useLeaveMatch(match.id)

  if (!user) {
    return (
      <Link
        to="/login"
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-meta font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        Log in to join
      </Link>
    )
  }

  const isMember = match.players.some((player) => player.id === user.id)
  const isFull = match.playerCount >= match.maxPlayers
  const isBusy = join.isPending || leave.isPending

  if (isMember) {
    return (
      <Button
        variant="secondary"
        isLoading={isBusy}
        // No arguments: the mutation holds the match id and the server reads the
        // user from the token.
        onClick={() => leave.mutate()}
      >
        Leave match
      </Button>
    )
  }

  if (isFull) {
    // Disabled rather than hidden — a missing button makes people hunt for it,
    // a labelled dead one answers the question.
    return (
      <Button variant="secondary" disabled>
        Match full
      </Button>
    )
  }

  return (
    <Button isLoading={isBusy} onClick={() => join.mutate()}>
      Join match
    </Button>
  )
}
