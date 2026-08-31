import { Link, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useAuthStore } from '../../auth/authStore'
import { useTeam } from '../api/useTeam'
import { RosterList } from './RosterList'
import { JoinTeamButton } from './JoinTeamButton'
import { isCaptain } from '../types'

function TeamProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      </div>
      <Card>
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="mt-3 h-4 w-1/2" />
      </Card>
    </div>
  )
}

/**
 * /teams/:id — team profile (docs/02-app-flow.md flow 5, docs/03 §4).
 *
 * The same four states as every other read screen: loading, error, not found,
 * success. Fourth time now — it should be automatic by this point.
 *
 * The new idea on this screen is ROLE-BASED UI: the captain sees a Manage
 * section that members don't. Read the long comment on that block below; it is
 * the part that matters.
 */
export function TeamProfilePage() {
  const { id = '' } = useParams()
  const { data: team, isPending, isError, error, refetch } = useTeam(id)
  const currentUserId = useAuthStore((state) => state.user?.id)

  if (isPending) return <TeamProfileSkeleton />

  if (isError) {
    const notFound = error.message.includes('does not exist')

    return (
      <div className="p-4 lg:p-6">
        <EmptyState
          title={notFound ? 'Team not found' : "Couldn't load this team"}
          description={
            notFound
              ? 'It may have been disbanded, or the link is wrong.'
              : 'Something went wrong on our end.'
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

  // ONE derived boolean drives every captain-only piece of this page.
  const youAreCaptain = isCaptain(team, currentUserId)
  const { wins, losses, draws } = team.record

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div>
        <Link to="/teams" className="text-meta text-content-muted hover:text-content">
          &larr; All teams
        </Link>

        <div className="mt-2 flex items-center gap-3">
          <Avatar name={team.name} colour={team.colour} size="lg" />
          <div className="min-w-0">
            <h1 className="truncate text-display text-content">{team.name}</h1>
            <p className="text-meta text-content-muted">{team.location}</p>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="text-meta font-medium text-content">Where &amp; when</h2>

        {/**
         * <dl> — a description list — is the correct element for label/value
         * pairs like this. A screen reader announces "Home ground: Greenfield
         * Turf", pairing each <dt> with its <dd>. Built from stacked <div>s
         * instead, it would read as six disconnected lines of text.
         *
         * Picking the element that matches the MEANING of your content, rather
         * than reaching for <div> and styling it, is most of what accessible
         * HTML actually is.
         */}
        <dl className="mt-3 flex flex-col gap-3">
          <div>
            <dt className="text-label text-content-muted">Home ground</dt>
            <dd className="text-meta text-content">{team.homeGround}</dd>
          </div>

          <div>
            <dt className="text-label text-content-muted">Plays</dt>
            <dd className="text-meta text-content">
              {/* Ternary for the plural. "1 times a week" is the kind of small
                  wrongness that makes an app feel unfinished. */}
              {team.playsPerWeek === 1
                ? 'Once a week'
                : `${team.playsPerWeek} times a week`}
            </dd>
          </div>
        </dl>
      </Card>

      <Card>
        <h2 className="text-meta font-medium text-content">Record</h2>
        <div className="mt-3 flex gap-6">
          {/* An array + map rather than three near-identical blocks of JSX.
              Adding "clean sheets" later means adding one line, not copying a
              div and hoping you changed every label inside it. */}
          {[
            { label: 'Won', value: wins },
            { label: 'Lost', value: losses },
            { label: 'Drawn', value: draws },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-heading text-content">{stat.value}</p>
              <p className="text-label text-content-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <RosterList team={team} currentUserId={currentUserId} />
      </Card>

      {/**
       * ============================================================
       *  ROLE-BASED UI — and why it is NOT security
       * ============================================================
       *
       * `youAreCaptain &&` means members never render this block. Good UX:
       * showing people buttons they cannot use is noise.
       *
       * But understand exactly what it buys you: NOTHING, security-wise.
       *
       * Anyone can open devtools, delete the condition, and click the button.
       * Anyone can skip the UI entirely and POST straight to the endpoint —
       * your React app is not in the way of that. Hiding a control makes the
       * app pleasant to use; it does not make it safe.
       *
       * THE RULE: the UI decides what to SHOW. The server decides what to
       * ALLOW. Both, always. When Phase 3b adds the real invite endpoint, it
       * checks `team.captainId === user.id` server-side and returns 403 if not
       * — regardless of what this component chose to render.
       *
       * That is the same thread as `maxPlayers` in Phase 2b and
       * identity-from-token in Phase 2c, and it answers the obvious question:
       * "you hid the admin button — is that enough?" No.
       */}
      {youAreCaptain && (
        <Card>
          <h2 className="text-meta font-medium text-content">Manage</h2>
          <p className="mt-1 text-meta text-content-muted">
            You&rsquo;re the captain of this team.
          </p>

          {/* Honest placeholder: the button exists so the shape of the screen
              is right, and is disabled because the flow behind it isn't built.
              A button that looks live and does nothing is worse than one that
              says so. */}
          {/**
           * The panels themselves moved to /teams/:id/manage.
           *
           * They were inline here, and the profile page was turning into two
           * pages fighting over one screen: a public thing everyone reads, and
           * a private thing exactly one person uses. Splitting on AUDIENCE
           * rather than on entity keeps each page about one job.
           *
           * A link, not a duplicate of the panels — one implementation, one
           * place to fix it.
           */}
          <Link to={`/teams/${team.id}/manage`} className="mt-3 block">
            <Button variant="secondary" className="w-full">
              Manage team
            </Button>
          </Link>
        </Card>
      )}

      {/* Sticky above the bottom nav, same as the Join button on a match —
          the primary action stays reachable however long the roster gets.
          Renders nothing at all for the captain (see JoinTeamButton). */}
      <div className="sticky bottom-20 z-10">
        <JoinTeamButton team={team} />
      </div>
    </div>
  )
}
