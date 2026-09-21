import { useDeferredValue, useState } from 'react'
import { Avatar } from '../../../shared/components/Avatar'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { useUserSearch } from '../api/useInvites'
import { useSendInvite } from '../api/useSendInvite'
import { isTeamFull, type Team } from '../types'

interface InvitePlayerPanelProps {
  team: Team
}

/**
 * The captain's "invite a player" search, inside the Manage card.
 *
 * Rendered only for the captain, which is UX rather than security — the server
 * 403s anyone else regardless.
 */
export function InvitePlayerPanel({ team }: InvitePlayerPanelProps) {
  // Local, not in the URL like Discover and Teams: nobody shares a link to the
  // invite box with "arj" typed in it.
  const [query, setQuery] = useState('')

  // The request keys off the deferred copy so typing stays responsive.
  const deferredQuery = useDeferredValue(query)

  const { data: results, isFetching } = useUserSearch(team.id, deferredQuery)
  const invite = useSendInvite(team.id)

  const full = isTeamFull(team)
  // isFetching, not isPending: the query is disabled below two characters, and
  // a disabled query stays pending forever — isPending would leave a skeleton
  // sitting over an empty search box.
  const searching = isFetching
  const hasQuery = deferredQuery.trim().length >= 2

  if (full) {
    return (
      <p className="mt-3 text-meta text-content-muted">
        The squad is full ({team.memberCount}/{team.maxMembers}). Someone has to
        leave before you can invite anyone else.
      </p>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-3">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search players by name or email"
        aria-label="Search players to invite"
        className="rounded-control border border-border-strong px-3 py-2 text-meta outline-none focus:ring-2 focus:ring-primary/40"
      />

      {!hasQuery && (
        <p className="text-meta text-content-faint">Type at least 2 characters to search.</p>
      )}

      {hasQuery && searching && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      )}

      {hasQuery && !searching && results?.length === 0 && (
        <p className="text-meta text-content-muted">No players match &ldquo;{deferredQuery}&rdquo;.</p>
      )}

      {hasQuery && !searching && results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((user) => {
            const unavailable = user.alreadyMember || user.alreadyInvited

            return (
              <li key={user.id} className="flex items-center gap-3">
                <Avatar name={user.name} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-meta text-content">{user.name}</p>
                  <p className="truncate text-label text-content-muted">{user.email}</p>
                </div>

                {/* Name the reason rather than just greying the button out. */}
                {user.alreadyMember ? (
                  <span className="shrink-0 text-label text-content-faint">In team</span>
                ) : user.alreadyInvited ? (
                  <span className="shrink-0 text-label text-content-faint">Invited</span>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0 px-3 py-1 text-label"
                    disabled={unavailable || invite.isPending}
                    onClick={() => invite.mutate(user.id)}
                  >
                    Invite
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
