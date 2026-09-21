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

/** "3 hours ago". See InvitesPage.tsx for why this is hand-rolled. */
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
 * The mirror of InvitesPage — same stored rows, same endpoint, same mutation,
 * opposite direction. Rendering it only for the captain is UX; the server's 403
 * is what enforces it.
 */
export function JoinRequestsPanel({ team, isCaptain }: JoinRequestsPanelProps) {
  // Passed into `enabled` rather than relying on a parent conditional.
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

  // One quiet line, not an EmptyState card: this is a section, not a page.
  if (!requests || requests.length === 0) {
    return <p className="mt-3 text-meta text-content-muted">No pending join requests.</p>
  }

  return (
    <div className="mt-3">
      {/* Count only — ManageTeamPage already supplies the heading. */}
      <Badge variant="warning">
        {requests.length} pending
      </Badge>

      {/* Reject still works when full; only Approve is blocked, so say why. */}
      {full && (
        <p className="mt-2 text-meta text-content-muted">
          The squad is full, so you can&rsquo;t approve anyone until someone leaves.
        </p>
      )}

      <ul className="mt-3 flex flex-col gap-3">
        {requests.map((request) => {
          // One mutation serves the whole list, so isPending alone would spin
          // every row. `variables` narrows it to the row being answered.
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
                  disabled={full}
                  onClick={() =>
                    respond.mutate({
                      membershipId: request.id,
                      action: 'accept',
                      // Picks the toast wording only.
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
