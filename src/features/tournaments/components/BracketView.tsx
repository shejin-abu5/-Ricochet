import { Avatar } from '../../../shared/components/Avatar'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { roundCount, roundName, type Tournament, type TournamentMatch } from '../types'

interface BracketViewProps {
  tournament: Tournament
  /** Organisers get a "Record result" button on playable matches. */
  isOrganiser: boolean
  onRecordResult: (match: TournamentMatch) => void
}

/** One side of a match. `undefined` team = still waiting on an earlier round. */
function TeamRow({
  name,
  colour,
  score,
  isWinner,
  isDecided,
}: {
  name?: string
  colour?: TournamentMatch['teamAColour']
  score?: number
  isWinner: boolean
  isDecided: boolean
}) {
  if (!name) {
    return (
      <div className="flex items-center gap-2 text-meta text-content-faint">
        <span
          aria-hidden="true"
          className="h-6 w-6 shrink-0 rounded-full border border-dashed border-border-strong"
        />
        <span>To be decided</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Avatar name={name} colour={colour} />
      <span
        className={`min-w-0 flex-1 truncate text-meta ${
          // Dim the loser once played: the fastest way to read a bracket is
          // "who is still bold". Before that both teams are equally live.
          isDecided && !isWinner ? 'text-content-faint' : 'text-content'
        }`}
      >
        {name}
      </span>
      {score !== undefined && (
        <span className="shrink-0 text-meta font-medium text-content">{score}</span>
      )}
    </div>
  )
}

function MatchNode({
  match,
  isOrganiser,
  onRecordResult,
}: {
  match: TournamentMatch
  isOrganiser: boolean
  onRecordResult: (match: TournamentMatch) => void
}) {
  const isDecided = match.status === 'played'

  return (
    <div className="rounded-control border border-border bg-surface p-3">
      <div className="flex flex-col gap-2">
        <TeamRow
          name={match.teamAName}
          colour={match.teamAColour}
          score={match.scoreA}
          isWinner={match.winnerTeamId === match.teamAId}
          isDecided={isDecided}
        />
        <TeamRow
          name={match.teamBName}
          colour={match.teamBColour}
          score={match.scoreB}
          isWinner={match.winnerTeamId === match.teamBId}
          isDecided={isDecided}
        />
      </div>

      {/* Only 'ready' takes a result — 'pending' is still waiting on an earlier
          round and 'played' already has one. */}
      {isOrganiser && match.status === 'ready' && (
        <Button
          variant="secondary"
          className="mt-3 w-full px-2 py-1 text-label"
          onClick={() => onRecordResult(match)}
        >
          Record result
        </Button>
      )}
    </div>
  )
}

/**
 * The bracket: one column per round, matches stacked inside.
 *
 * No tree is walked. Every match carries its `round` and `slot`, so this is a
 * group-by and a sort — which is why a half-finished bracket needs no special
 * case and there are no parent/child links to keep in step.
 *
 * Styling is plain boxes in scrollable columns; connector lines are a
 * visual-pass job (docs/03), and the data is already shaped for them.
 */
export function BracketView({ tournament, isOrganiser, onRecordResult }: BracketViewProps) {
  const matches = tournament.matches ?? []

  if (matches.length === 0) {
    return (
      <p className="text-meta text-content-muted">
        The bracket hasn&rsquo;t been drawn yet.
      </p>
    )
  }

  const rounds = roundCount(tournament.slots)

  return (
    // On the wrapper, not the page, so a wide bracket scrolls inside its own
    // box and the page never scrolls sideways.
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-4">
        {/* Rounds are 1-indexed to match the data, hence the +1. */}
        {Array.from({ length: rounds }, (_, i) => i + 1).map((round) => {
          const roundMatches = matches
            .filter((m) => m.round === round)
            .sort((a, b) => a.slot - b.slot)

          return (
            <div key={round} className="flex w-56 shrink-0 flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-meta font-medium text-content">
                  {roundName(round, tournament.slots)}
                </h3>
                <Badge>{roundMatches.length}</Badge>
              </div>

              {roundMatches.map((match) => (
                <MatchNode
                  key={match.id}
                  match={match}
                  isOrganiser={isOrganiser}
                  onRecordResult={onRecordResult}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
