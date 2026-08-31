import { Link, Navigate, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Avatar } from '../../../shared/components/Avatar'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useAuthStore } from '../../auth/authStore'
import { useTeam } from '../api/useTeam'
import { JoinRequestsPanel } from './JoinRequestsPanel'
import { InvitePlayerPanel } from './InvitePlayerPanel'
import { TeamOptionsForm } from './TeamOptionsForm'
import { isCaptain } from '../types'

/**
 * A section heading + card, repeated four times on this page. Extracted here
 * rather than copy-pasted because the page is literally a list of these — the
 * moment a shape appears four times in one file, it's a component.
 *
 * Local to this file (not exported, not in shared/) because nothing else needs
 * it yet. Same rule as always: extract on the second use, promote to shared/
 * on the second CONSUMER.
 */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <h2 className="text-meta font-medium text-content">{title}</h2>
      {description && <p className="mt-1 text-meta text-content-muted">{description}</p>}
      {children}
    </Card>
  )
}

function ManageSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <Skeleton className="h-6 w-1/2" />
      <Card>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-3 h-16 w-full" />
      </Card>
      <Card>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-3 h-16 w-full" />
      </Card>
    </div>
  )
}

/**
 * /teams/:id/manage — the captain's page.
 *
 * Everything a captain does lives here instead of being stacked onto the team
 * profile: join requests, inviting players, upcoming tournaments, and team
 * settings. The design brief (docs/03 §4) asks for exactly this — "captain sees
 * an extra Manage tab" — and the profile page stays readable for the people
 * who mostly visit it, which is everyone else.
 *
 * ============================================================
 *  ROUTE GUARDS CAN ONLY CHECK WHAT THEY KNOW SYNCHRONOUSLY
 * ============================================================
 *
 * <ProtectedRoute> keeps guests out, because "am I logged in?" is answered
 * instantly by the Zustand store. It CANNOT keep non-captains out, because
 * "am I the captain of team t3?" requires fetching team t3 first.
 *
 * So the check has to happen here, after the query resolves — which means
 * accepting that a non-captain briefly sees a loading skeleton before being
 * redirected. That's unavoidable in a client-side SPA, and it's fine, because
 * the skeleton reveals nothing.
 *
 * What makes it SAFE is not this component. It's that every endpoint behind
 * these panels independently returns 403 to a non-captain. This redirect is
 * politeness; the server is the security.
 */
export function ManageTeamPage() {
  const { id = '' } = useParams()
  const { data: team, isPending, isError, error, refetch } = useTeam(id)
  const currentUserId = useAuthStore((state) => state.user?.id)

  if (isPending) return <ManageSkeleton />

  if (isError) {
    const notFound = error.message.includes('does not exist')

    return (
      <div className="p-4 lg:p-6">
        <EmptyState
          title={notFound ? 'Team not found' : "Couldn't load this team"}
          description={
            notFound ? 'It may have been disbanded.' : 'Something went wrong on our end.'
          }
          action={
            notFound ? (
              <Link to="/teams">
                <Button variant="secondary">Back to teams</Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            )
          }
        />
      </div>
    )
  }

  const youAreCaptain = isCaptain(team, currentUserId)

  /**
   * `replace` swaps this URL in history instead of adding to it. Without it,
   * the back button would return here, redirect again, and trap the user in a
   * loop they cannot escape by going back — a small detail that makes an app
   * feel broken.
   */
  if (!youAreCaptain) return <Navigate to={`/teams/${team.id}`} replace />

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div>
        <Link to={`/teams/${team.id}`} className="text-meta text-content-muted hover:text-content">
          &larr; {team.name}
        </Link>

        <div className="mt-2 flex items-center gap-3">
          <Avatar name={team.name} colour={team.colour} size="md" />
          <div className="min-w-0">
            <h1 className="truncate text-display text-content">Manage team</h1>
            <p className="text-meta text-content-muted">
              {team.memberCount}/{team.maxMembers} members
            </p>
          </div>
        </div>
      </div>

      {/* 1 — requests coming IN from players. */}
      <Section title="Join requests" description="Players who asked to join.">
        <JoinRequestsPanel team={team} isCaptain={youAreCaptain} />
      </Section>

      {/* 2 — invites going OUT from the captain. The mirror of the above:
             same table, opposite direction. See docs/09. */}
      <Section title="Invite a player" description="Search and send an invite.">
        <InvitePlayerPanel team={team} />
      </Section>

      {/* 3 — Phase 5. An honest placeholder: it shows the shape the section
             will take and says plainly that it isn't built, rather than
             pretending with fake rows or a button that does nothing. */}
      <Section
        title="Upcoming tournaments"
        description="Tournaments this team has entered."
      >
        <div className="mt-3 rounded-control border border-dashed border-border-strong p-4 text-center">
          <p className="text-meta text-content-muted">No tournaments yet.</p>
          <p className="mt-1 text-label text-content-faint">
            Entering tournaments arrives in Phase 5 &mdash; see
            docs/00-architecture.md.
          </p>
        </div>
      </Section>

      {/* 4 — team settings. */}
      <Section title="Team options" description="Only you can change these.">
        <div className="mt-3">
          <TeamOptionsForm team={team} />
        </div>
      </Section>
    </div>
  )
}
