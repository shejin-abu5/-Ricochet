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

/** Heading + card, repeated four times below. Local until a second page wants it. */
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
 * /teams/:id/manage — the captain's page (docs/03 §4).
 *
 * The captaincy check lives in the component, not in a route guard:
 * <ProtectedRoute> can answer "am I logged in?" from the store synchronously,
 * but "am I captain of t3?" needs t3 fetched first. So a non-captain briefly
 * sees a skeleton before the redirect — unavoidable in a client-side SPA, and
 * harmless, since the skeleton reveals nothing and every endpoint behind these
 * panels 403s independently.
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

  // `replace`, or the back button lands here, redirects again, and traps the
  // user in a loop.
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

      <Section title="Join requests" description="Players who asked to join.">
        <JoinRequestsPanel team={team} isCaptain={youAreCaptain} />
      </Section>

      {/* The mirror of the above: same table, opposite direction. */}
      <Section title="Invite a player" description="Search and send an invite.">
        <InvitePlayerPanel team={team} />
      </Section>

      {/* Placeholder that states plainly it is unbuilt, rather than showing
          fake rows or a button that does nothing. */}
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

      <Section title="Team options" description="Only you can change these.">
        <div className="mt-3">
          <TeamOptionsForm team={team} />
        </div>
      </Section>
    </div>
  )
}
