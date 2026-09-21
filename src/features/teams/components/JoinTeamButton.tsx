import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { useAuthStore } from '../../auth/authStore'
import { useRequestToJoinTeam, useLeaveTeam } from '../api/useJoinTeam'
import { isCaptain, isMember, isTeamFull, type Team } from '../types'

interface JoinTeamButtonProps {
  team: Team
}

/**
 * The team membership control. Seven states, and the ORDER is the design —
 * several are true at once and the most specific must win:
 *
 *   guest / captain / member / request sent / full / in flight / can join
 *
 * Captain is checked before full because a captain of a full squad matches
 * both, and "Team full" is not why they have no button. "Request sent" sits
 * above full for the same reason: if you already asked, that is the useful
 * thing to say whatever else is true of the squad.
 *
 * Every branch is derived from the team and the user, so the button updates
 * itself the moment the cache changes.
 */
export function JoinTeamButton({ team }: JoinTeamButtonProps) {
  const user = useAuthStore((state) => state.user)

  // Created unconditionally to satisfy the rules of hooks; nothing runs until
  // .mutate().
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

  // Compared explicitly rather than tested for truthiness: only the detail
  // endpoint answers `yourRequestStatus`, so undefined means "not answered
  // here", not "no".
  if (team.yourRequestStatus === 'pending') {
    return (
      <div>
        <Button variant="secondary" className="w-full" disabled>
          Request sent
        </Button>
        {/* A disabled button with no explanation reads as a bug; one sentence
            turns it into a status. */}
        <p className="mt-2 text-center text-label text-content-muted">
          Waiting for the captain to approve you.
        </p>
      </div>
    )
  }

  if (isTeamFull(team)) {
    // Disabled and labelled, not hidden — a missing button makes people hunt.
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
