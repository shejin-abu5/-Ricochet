import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useJoinMatch, useLeaveMatch } from '../api/useJoinMatch'
import type { Match } from '../types'

interface JoinMatchButtonProps {
  match: Match
}

/**
 * One button, five different things it can be. Working out WHICH is most of
 * the logic on this screen, so it lives in its own small component rather
 * than as a tangle of ternaries inside MatchDetailPage.
 *
 *   guest          → "Log in to join"  (a link, not a button)
 *   already in     → "Leave match"
 *   full           → "Match full", disabled
 *   request in air → "Loading…", disabled
 *   otherwise      → "Join match"
 *
 * ---- WIDTH IS THE CALLER'S BUSINESS ----
 *
 * Every branch used to carry `className="w-full"`. That baked a layout
 * decision into a component whose job is deciding WHAT the button says — so
 * the only way to place it anywhere narrower was to override the class from
 * outside, which is the kind of fight that ends in `!important`.
 *
 * Now each branch sizes to its own content (Button is `inline-flex`), and a
 * caller that wants it stretched adds `w-full` to a wrapper. Components should
 * own their behaviour and let their container own their size.
 *
 * ---- EVERYTHING HERE IS DERIVED ----
 *
 * Notice there is not a single useState in this file. "Am I in this match?"
 * is not a piece of state to store and keep in sync — it is a question you
 * answer by looking at the roster you already have:
 *
 *   match.players.some((p) => p.id === user.id)
 *
 * Store that in useState instead and you now own the job of updating it every
 * time the match changes, forever. That is the bug factory docs/02-app-flow.md
 * means by "derived from server state, not duplicated state".
 *
 * And because it is derived, the optimistic update gets this for free: the
 * moment useJoinMatch writes you into the cached roster, this recomputes and
 * the button flips to "Leave" on its own.
 */
export function JoinMatchButton({ match }: JoinMatchButtonProps) {
  const user = useAuthStore((state) => state.user)

  // Both hooks are always called — React requires hooks to run in the same
  // order on every render, so you can never call one inside an `if`. Creating
  // a mutation object is cheap; nothing happens until you call .mutate().
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
        // No arguments: the mutation already knows the match id (it was passed
        // to useLeaveMatch above) and the server knows who you are from your
        // token. There is genuinely nothing left to send.
        onClick={() => leave.mutate()}
      >
        Leave match
      </Button>
    )
  }

  if (isFull) {
    // Disabled rather than hidden. A missing button makes people hunt for it;
    // a disabled one labelled "Match full" answers the question immediately.
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
