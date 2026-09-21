import { Card } from '../../../shared/components/Card'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useMyProfile } from '../api/useProfile'
import { ProfileOverview } from './ProfileOverview'
import { SkillsCard } from './SkillsCard'
import { MyTeamsCard } from './MyTeamsCard'

function ProfileSkeleton() {
  return (
    <Card>
      <div className="flex gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/3" />
        </div>
      </div>
    </Card>
  )
}

/**
 * /profile — overview, skills and current teams.
 *
 * Two queries run here, and each section owns its own loading state rather than
 * one skeleton covering the page: a single boundary makes every section as slow
 * as the slowest request, and lets one failing endpoint blank content that was
 * ready. Overview and skills gate on the profile; MyTeamsCard fetches and gates
 * itself.
 *
 * Styling is deliberately plain — the visual pass comes once functionality is
 * complete (docs/03, docs/11).
 */
export function ProfilePage() {
  const { data: profile, isPending, isError, refetch } = useMyProfile()

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <h1 className="text-display text-content">Profile</h1>

      {isPending && <ProfileSkeleton />}

      {isError && (
        <EmptyState
          title="Couldn't load your profile"
          description="Something went wrong on our end."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {/* Two cards, not one: "who you are" and "how you play" are different
          questions that will grow at different rates. */}
      {profile && (
        <>
          <Card>
            <ProfileOverview profile={profile} />
          </Card>

          <Card>
            <h2 className="text-meta font-medium text-content">Skills</h2>
            <div className="mt-3">
              <SkillsCard profile={profile} />
            </div>
          </Card>
        </>
      )}

      {/* Deliberately outside the `profile &&` above, so a slow or failed
          profile request cannot hide it. */}
      <Card>
        <h2 className="text-meta font-medium text-content">Current teams</h2>
        <div className="mt-3">
          <MyTeamsCard />
        </div>
      </Card>
    </div>
  )
}
