import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useMyInvites } from '../api/useInvites'
import { useRespondToMembership } from '../api/useRespondToMembership'

/**
 * Turn an ISO timestamp into "3 hours ago".
 *
 * Hand-rolled because it's ~10 lines and the alternative is a date library for
 * one string. Intl.RelativeTimeFormat handles the wording (and the plurals,
 * and other languages) — we only have to decide which unit to use.
 *
 * The moment this needs "last Tuesday" or timezone maths, reach for date-fns.
 * Knowing WHERE that line is matters more than which side of it you're on.
 */
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000

  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), 'minute')
  if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), 'hour')
  return relative.format(-Math.round(seconds / 86_400), 'day')
}

function InviteSkeleton() {
  return (
    <Card>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      </div>
    </Card>
  )
}

/**
 * /invites — the invitations inbox (docs/02-app-flow.md flow 5, step 3).
 *
 * The same four states as every read screen. By now the shape should be
 * automatic; the interesting code is in useRespondToInvite.ts.
 */
export function InvitesPage() {
  const { data: invites, isPending, isError, refetch } = useMyInvites()
  // The SAME hook the captain's JoinRequestsPanel uses. One endpoint answers
  // both directions, so one mutation hook serves both screens — see the note
  // at the top of useRespondToMembership.ts.
  const respond = useRespondToMembership()

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div>
        <Link to="/teams" className="text-meta text-content-muted hover:text-content">
          &larr; Teams
        </Link>
        <h1 className="mt-2 text-display text-content">Invitations</h1>
        <p className="text-meta text-content-muted">Teams that want you</p>
      </div>

      {isPending && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <InviteSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title="Couldn't load your invites"
          description="Something went wrong on our end."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {!isPending && !isError && invites?.length === 0 && (
        <EmptyState
          title="No pending invites"
          description="When a captain invites you to their team, it'll show up here."
          action={
            <Link to="/teams">
              <Button variant="secondary">Browse teams</Button>
            </Link>
          }
        />
      )}

      {!isPending && !isError && invites && invites.length > 0 && (
        <ul className="flex flex-col gap-3">
          {invites.map((invite) => {
            /**
             * `respond.isPending` is true while ANY invite is being answered,
             * because there is one mutation object shared by the whole list.
             * `variables` holds the arguments of the in-flight call, so this
             * narrows the spinner to the row actually being answered.
             *
             * Without it, answering one invite disables every button on the
             * page — which looks broken, especially on a slow connection.
             */
            const busy = respond.isPending && respond.variables?.membershipId === invite.id

            return (
              <li key={invite.id}>
                <Card>
                  <div className="flex items-start gap-3">
                    <Avatar name={invite.teamName} colour={invite.teamColour} size="md" />

                    <div className="min-w-0 flex-1">
                      {/* The team name links out, so you can look at who you'd
                          be joining before deciding. */}
                      <Link
                        to={`/teams/${invite.teamId}`}
                        className="truncate font-medium text-content hover:text-primary"
                      >
                        {invite.teamName}
                      </Link>
                      <p className="truncate text-meta text-content-muted">
                        {invite.invitedByName} invited you
                      </p>
                      {/* <time> with a machine-readable dateTime: assistive tech
                          and crawlers get the exact timestamp, humans get
                          "3 hours ago". */}
                      <time dateTime={invite.createdAt} className="text-label text-content-faint">
                        {timeAgo(invite.createdAt)}
                      </time>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      isLoading={busy}
                      onClick={() =>
                        respond.mutate({
                          membershipId: invite.id,
                          action: 'accept',
                          // Picks the toast wording: you're the player here,
                          // so "You joined the team" rather than the captain's
                          // "Player added to the squad".
                          kind: 'invite',
                        })
                      }
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      disabled={busy}
                      onClick={() =>
                        respond.mutate({
                          membershipId: invite.id,
                          action: 'decline',
                          kind: 'invite',
                        })
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
