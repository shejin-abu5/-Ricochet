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
 * /profile — the profile card: overview, skills, current teams.
 *
 * ============================================================
 *  LOADING GRANULARITY — the idea worth taking from this page
 * ============================================================
 *
 * This page runs TWO queries: the profile (/api/me) and my teams
 * (/api/me/teams). The obvious thing is to wait for both and show one skeleton
 * over everything.
 *
 * Don't. That makes every section as slow as the SLOWEST request, and it means
 * one failing endpoint blanks a page that could have shown two thirds of its
 * content perfectly well.
 *
 * Instead each section owns its own state:
 *
 *   overview + skills  →  need the profile, so this page gates them
 *   current teams      →  MyTeamsCard fetches and gates itself
 *
 * So the profile arrives and renders while the teams request is still in
 * flight, and a teams failure shows a retry inside that one card while
 * everything else stays usable.
 *
 * THE RULE: put the loading boundary where the DATA boundary is. One spinner
 * per page is the default because it's easy, not because it's right.
 *
 * ---- ON STYLING ----
 *
 * Structure and data only, deliberately kept plain. The visual pass happens
 * once functionality is complete — see docs/03-uiux-design-brief.md for the
 * intended direction and the note in docs/11.
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

      {/* Both of these need the profile, so they render together once it's
          here. Two cards rather than one, because "who you are" and "how you
          play" are different questions and will grow at different rates. */}
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

      {/* Independent of the profile query — renders its own skeleton, its own
          error, its own empty state. Deliberately OUTSIDE the `profile &&`
          above, so a slow or failed profile request doesn't hide it. */}
      <Card>
        <h2 className="text-meta font-medium text-content">Current teams</h2>
        <div className="mt-3">
          <MyTeamsCard />
        </div>
      </Card>
    </div>
  )
}
