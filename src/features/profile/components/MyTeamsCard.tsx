import { Link } from 'react-router-dom'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useMyTeams } from '../api/useProfile'
import { TeamCard } from '../../teams/components/TeamCard'
import { isCaptain } from '../../teams/types'
import { useAuthStore } from '../../auth/authStore'

/**
 * Section 3: the teams you're on.
 *
 * ============================================================
 *  IMPORTING ACROSS FEATURES
 * ============================================================
 *
 * This file is in features/profile/ and imports TeamCard from features/teams/.
 * Worth pausing on, because feature-based folders are often taught as "features
 * must not touch each other".
 *
 * The real rule is narrower and more useful:
 *
 *   ✅ A feature may depend on another feature, if the dependency runs ONE WAY.
 *   ❌ Two features importing from each other is a cycle — and cycles are where
 *      "why did changing this file break that unrelated one?" comes from.
 *
 * profile → teams is fine. teams does not know profile exists.
 *
 * The alternative was moving TeamCard to shared/. That would be wrong: shared/
 * is for components that know NOTHING about our domain (Button, Card, Avatar),
 * and TeamCard understands what a team is. Moving it there to dodge an import
 * would make shared/ the place where domain code goes to hide.
 *
 * (If a THIRD feature needed a team card, that would be the moment to
 * reconsider — the same "second consumer" rule that moved Avatar to shared/.)
 *
 * ---- WHY THIS CARD FETCHES ITS OWN DATA ----
 *
 * Unlike ProfileOverview and SkillsCard, which take props, this one calls
 * useMyTeams itself. That is deliberate: the teams query resolves separately
 * from the profile query, so this section can show its own loading state while
 * the rest of the page is already readable. Lifting the query to the page
 * would mean the page deciding when this section is ready — and the whole page
 * waiting on the slower of two requests.
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
          // Derived on the spot from data already in hand — no "which teams do
          // I captain" query, no stored flag. Same instinct as everywhere else.
          isYourTeam={isCaptain(team, currentUserId)}
        />
      ))}
    </div>
  )
}
