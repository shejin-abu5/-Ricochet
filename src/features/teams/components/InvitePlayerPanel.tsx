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
 * The captain's "invite a player" search, inside the Manage card on the team
 * profile. Rendered only for the captain — and, as ever, that is UX and not
 * security: the server returns 403 to anyone else regardless.
 */
export function InvitePlayerPanel({ team }: InvitePlayerPanelProps) {
  /**
   * Search text is LOCAL state, not the URL.
   *
   * DiscoverPage and TeamsPage both put their search in the address bar, on
   * purpose — a filtered list is worth sharing and worth having in history.
   * This one isn't: nobody links someone to "the invite box with 'arj' typed
   * in it". Same technique, opposite decision, because the question is always
   * "does this belong in a shareable URL?" rather than "which hook do I like".
   */
  const [query, setQuery] = useState('')

  // The input updates instantly; the deferred copy lags slightly and is what
  // drives the request, so typing stays responsive and we don't fire a
  // request per keystroke. Same as the search on Discover.
  const deferredQuery = useDeferredValue(query)

  const { data: results, isFetching } = useUserSearch(team.id, deferredQuery)
  const invite = useSendInvite(team.id)

  const full = isTeamFull(team)
  // `isFetching` rather than `isPending`: this query is disabled below two
  // characters, and a disabled query is permanently "pending" — so isPending
  // would show a skeleton over an empty search box forever.
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
            // Both flags come from the SERVER, which has the roster and the
            // invite table. The client couldn't work either out reliably —
            // see the note on InvitableUser in ../types.ts.
            const unavailable = user.alreadyMember || user.alreadyInvited

            return (
              <li key={user.id} className="flex items-center gap-3">
                <Avatar name={user.name} />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-meta text-content">{user.name}</p>
                  <p className="truncate text-label text-content-muted">{user.email}</p>
                </div>

                {/* Explain WHY it's unavailable rather than just greying out a
                    button. "Invited" and "In team" answer the question the
                    disabled state raises. */}
                {user.alreadyMember ? (
                  <span className="shrink-0 text-label text-content-faint">In team</span>
                ) : user.alreadyInvited ? (
                  <span className="shrink-0 text-label text-content-faint">Invited</span>
                ) : (
                  <Button
                    variant="secondary"
                    className="shrink-0 px-3 py-1 text-label"
                    disabled={unavailable || invite.isPending}
                    // The mutation is per-team, so it only needs the user id.
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
