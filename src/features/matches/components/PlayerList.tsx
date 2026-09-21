import { Avatar } from '../../../shared/components/Avatar'
import type { MatchPlayer } from '../types'

interface PlayerListProps {
  players: MatchPlayer[]
  maxPlayers: number
  /** Id of the logged-in user, so we can mark which row is them. */
  currentUserId?: string
}

/**
 * The joined-players roster on the match detail page.
 *
 * Takes plain props and fetches nothing, so the team roster screen can reuse
 * it as-is.
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

        {/* Dashed circles for the open spots: the shape of what is missing
            reads faster than "2 spots left" on its own. */}
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
