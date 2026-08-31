import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useRequestToJoinTeam, useLeaveTeam } from '../api/useJoinTeam'
import { isCaptain, isMember, isTeamFull, type Team } from '../types'

interface JoinTeamButtonProps {
  team: Team
}

/**
 * SEVEN states, in priority order. The ORDER is the design — several of these
 * are true at once and only the most specific one should win.
 *
 *   guest         → "Log in to join"
 *   captain       → nothing (a captain can't leave their own team)
 *   member        → "Leave team"
 *   request sent  → "Request sent", disabled     ← new
 *   full          → "Team full", disabled
 *   in flight     → "Loading…", disabled
 *   otherwise     → "Request to join"
 *
 * Read the captain and full branches together. A captain of a FULL team
 * matches both — and showing them "Team full" would be nonsense, because
 * fullness is not why they have no button. Checking captaincy first is not
 * arbitrary ordering; it is "answer the most specific question first".
 *
 * The new "request sent" branch sits ABOVE "full" for the same reason: if you
 * already asked, that is the more useful thing to tell you, whatever else is
 * also true of the squad right now.
 *
 * Get this ordering backwards and you ship a button whose label is technically
 * true and completely unhelpful. Classic source of confusing UI.
 *
 * As in JoinMatchButton, there is no useState here — every branch is derived
 * from the team and the current user, so the screen updates itself the moment
 * the cache changes.
 */
export function JoinTeamButton({ team }: JoinTeamButtonProps) {
  const user = useAuthStore((state) => state.user)

  // Hooks always run, in the same order, every render — never inside an `if`.
  // Creating a mutation is cheap; nothing happens until .mutate() is called.
  const requestToJoin = useRequestToJoinTeam(team.id)
  const leave = useLeaveTeam(team.id)

  if (!user) {
    return (
      <Link
        to="/login"
        className="flex min-h-11 items-center justify-center rounded-control bg-primary px-4 text-meta font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        Log in to join
      </Link>
    )
  }

  // The captain's own controls are the Manage section on the profile page, so
  // there is deliberately no button at all here.
  if (isCaptain(team, user.id)) return null

  const isBusy = requestToJoin.isPending || leave.isPending

  if (isMember(team, user.id)) {
    return (
      <Button
        variant="secondary"
        className="w-full"
        isLoading={isBusy}
        onClick={() => leave.mutate()}
      >
        Leave team
      </Button>
    )
  }

  /**
   * `yourRequestStatus` is computed by the server and only present on the
   * DETAIL response — it depends on who is asking, so the shared list endpoint
   * can't answer it. Undefined therefore means "not answered here", which is
   * why this compares to 'pending' explicitly rather than testing truthiness.
   */
  if (team.yourRequestStatus === 'pending') {
    return (
      <div>
        <Button variant="secondary" className="w-full" disabled>
          Request sent
        </Button>
        {/* Say what happens next. A disabled button with no explanation reads
            as a bug; one sentence turns it into a status. */}
        <p className="mt-2 text-center text-label text-content-muted">
          Waiting for the captain to approve you.
        </p>
      </div>
    )
  }

  if (isTeamFull(team)) {
    // Disabled and labelled, not hidden. A missing button makes people hunt
    // for it; this one answers the question immediately.
    return (
      <Button variant="secondary" className="w-full" disabled>
        Team full &middot; {team.memberCount}/{team.maxMembers}
      </Button>
    )
  }

  return (
    <Button className="w-full" isLoading={isBusy} onClick={() => requestToJoin.mutate()}>
      Request to join
    </Button>
  )
}
