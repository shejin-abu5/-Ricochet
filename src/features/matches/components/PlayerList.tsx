import { Avatar } from '../../../shared/components/Avatar'
import type { MatchPlayer } from '../types'

interface PlayerListProps {
  players: MatchPlayer[]
  maxPlayers: number
  /** Id of the logged-in user, so we can mark which row is them. */
  currentUserId?: string
}

/**
 * PHASE 3A REFACTOR: this file used to contain its own `initials()` helper and
 * its own circle markup. Phase 3a needed the same thing for team badges, so it
 * moved to shared/components/Avatar.tsx and this file now just uses it.
 *
 * Worth doing the moment duplication appears the SECOND time, not the fifth.
 * Two copies is where the cost of extracting is lowest and the drift hasn't
 * started yet — by copy five they all have slightly different padding and
 * nobody knows which is correct.
 */

/**
 * The joined-players roster on the match detail page.
 *
 * WHY THIS MATTERS FOR PHASE 2C: this list is where the optimistic update
 * becomes visible. Tap Join and your row appears here in the same frame as
 * the click, before any request has finished. If the server then rejects it,
 * you watch the row disappear again. A number changing from 8 to 9 would
 * teach you the same thing far less vividly.
 *
 * Like MatchList, this takes plain props and fetches nothing — the team
 * roster screen in Phase 3 can reuse it as-is.
 */
export function PlayerList({ players, maxPlayers, currentUserId }: PlayerListProps) {
  const emptySlots = Math.max(0, maxPlayers - players.length)

  return (
    <div>
      <h2 className="text-meta font-medium text-content">
        Players{' '}
        <span className="font-normal text-content-muted">
          {players.length} / {maxPlayers}
        </span>
      </h2>

      <ul className="mt-3 flex flex-col gap-2">
        {players.map((player) => {
          const isYou = player.id === currentUserId

          return (
            <li key={player.id} className="flex items-center gap-3">
              <Avatar name={player.name} />

              <span className="truncate text-meta text-content">{player.name}</span>

              {isYou && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-label font-medium text-primary">
                  You
                </span>
              )}
            </li>
          )
        })}

        {/* Empty slots, drawn as dashed circles. Showing the shape of what is
            missing reads faster than the text "2 spots left" alone — you can
            see at a glance how close a match is to going ahead. */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <li key={`empty-${i}`} className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-8 w-8 shrink-0 rounded-full border border-dashed border-border-strong"
            />
            <span className="text-meta text-content-faint">Open spot</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
