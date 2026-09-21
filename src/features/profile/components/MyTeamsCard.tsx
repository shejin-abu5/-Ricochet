import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useMyTeams } from '../api/useProfile'
import { TeamCard } from '../../teams/components/TeamCard'
import { isCaptain } from '../../teams/types'
import { useAuthStore } from '../../auth/authStore'

/**
 * The teams you are on.
 *
 * Imports TeamCard from the teams feature rather than moving it to shared/:
 * shared/ is for components that know nothing about the domain, and a team card
 * knows what a team is. The dependency runs one way — teams does not know
 * profile exists.
 *
 * Fetches its own data, unlike the sibling cards that take props, so this
 * section can show its own loading state while the rest of the page is already
 * readable.
 */
export function MyTeamsCard() {
  const { data: teams, isPending, isError, refetch } = useMyTeams()
  const currentUserId = useAuthStore((state) => state.user?.id)

  if (isPending) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        <p className="text-meta text-content-muted">Couldn&rsquo;t load your teams.</p>
        <Button variant="secondary" className="mt-2" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    )
  }

  if (!teams || teams.length === 0) {
    return (
      <div>
        <p className="text-meta text-content-muted">You&rsquo;re not on any teams yet.</p>
        <Link to="/teams" className="mt-2 inline-block">
          <Button variant="secondary">Browse teams</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          isYourTeam={isCaptain(team, currentUserId)}
        />
      ))}
    </div>
  )
}
