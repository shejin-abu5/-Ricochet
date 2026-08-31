import { Avatar } from '../../../shared/components/Avatar'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useJoinRequests } from '../api/useInvites'
import { useRespondToMembership } from '../api/useRespondToMembership'
import { isTeamFull, type Team } from '../types'

interface JoinRequestsPanelProps {
  team: Team
  /** Rendered only for the captain, and used to gate the query too. */
  isCaptain: boolean
}

/** "3 hours ago" — see InvitesPage.tsx for why this is hand-rolled. */
const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function timeAgo(iso: string): string {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000

  if (seconds < 3600) return relative.format(-Math.round(seconds / 60), 'minute')
  if (seconds < 86_400) return relative.format(-Math.round(seconds / 3600), 'hour')
  return relative.format(-Math.round(seconds / 86_400), 'day')
}

/**
 * The captain's approval queue: players who asked to join this team.
 *
 * The exact mirror of InvitesPage. There, YOU received an invite and answered
 * it; here, YOUR TEAM received a request and you answer it. Same stored rows
 * (mocks/membershipData.ts), same endpoint, same mutation hook — only the
 * direction and therefore the wording differ.
 *
 * As always: rendering this only for the captain is UX. The server returns 403
 * to anyone else, which is the part that actually enforces it.
 */
export function JoinRequestsPanel({ team, isCaptain }: JoinRequestsPanelProps) {
  // The boolean is passed down into `enabled` rather than wrapping this
  // component in a conditional and hoping — see the note in useInvites.ts.
  const { data: requests, isPending, isError } = useJoinRequests(team.id, isCaptain)
  const respond = useRespondToMembership()

  const full = isTeamFull(team)

  if (isPending) {
    return <Skeleton className="mt-3 h-16 w-full" />
  }

  if (isError) {
    return (
      <p className="mt-3 text-meta text-content-muted">Couldn&rsquo;t load join requests.</p>
    )
  }

  // Nothing pending is the normal state, so it gets one quiet line rather than
  // a full EmptyState card — this is a section inside a page, not the page.
  if (!requests || requests.length === 0) {
    return <p className="mt-3 text-meta text-content-muted">No pending join requests.</p>
  }

  return (
    <div className="mt-3">
      {/* Just the count. The section around this already says "Join requests"
          (see ManageTeamPage), and a component that repeats its container's
          heading is how pages end up saying everything twice. A panel should
          render its CONTENT and let whoever placed it do the labelling. */}
      <Badge variant="warning">
        {requests.length} pending
      </Badge>

      {/* The captain can still REJECT while full — they just can't approve.
          Explaining why the Approve buttons are dead is the difference between
          a broken screen and an understood one. */}
      {full && (
        <p className="mt-2 text-meta text-content-muted">
          The squad is full, so you can&rsquo;t approve anyone until someone leaves.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {requests.map((request) => {
          /**
           * One mutation object serves the whole list, so `respond.isPending`
           * is true for EVERY row while any one of them is in flight.
           * `variables` holds the arguments of the call currently running,
           * which narrows the spinner to the row actually being answered.
           *
           * Without this, approving one player disables every button on the
           * page — which looks broken, especially on a slow connection.
           */
          const busy =
            respond.isPending && respond.variables?.membershipId === request.id

          return (
            <li key={request.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Avatar name={request.playerName} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-meta text-content">{request.playerName}</p>
                  <p className="truncate text-label text-content-muted">{request.playerEmail}</p>
                </div>

                <time
                  dateTime={request.createdAt}
                  className="shrink-0 text-label text-content-faint"
                >
                  {timeAgo(request.createdAt)}
                </time>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 py-1 text-label"
                  isLoading={busy}
                  // Can't add anyone to a squad that has no room.
                  disabled={full}
                  onClick={() =>
                    respond.mutate({
                      membershipId: request.id,
                      action: 'accept',
                      // Only used to pick the toast wording — a captain
                      // "adds a player", a player "joins a team".
                      kind: 'request',
                    })
                  }
                >
                  Approve
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1 py-1 text-label"
                  disabled={busy}
                  onClick={() =>
                    respond.mutate({
                      membershipId: request.id,
                      action: 'decline',
                      kind: 'request',
                    })
                  }
                >
                  Reject
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
