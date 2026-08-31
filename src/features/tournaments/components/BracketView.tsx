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
          // Once a match is played, the loser is dimmed — the fastest way to
          // read a bracket is "who is still bold". Before it's played, both
          // teams are equally live, so no emphasis either way.
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

      {/* Only 'ready' matches can take a result: 'pending' is still waiting on
          an earlier round, 'played' already has one. That three-way status
          comes from the server so every screen agrees — see matchStatus() in
          mocks/handlers.ts. */}
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
 * ---- WHY THE COLUMNS BUILD THEMSELVES ----
 *
 * There's no bracket "tree" walked here. Every match carries a `round`, so the
 * view is just: group by round, sort by slot, render columns left to right.
 * The structure is two integers per match and one formula on the server (see
 * the advancement rule in handlers.ts) — no parent/child links to keep in step.
 *
 * That's the payoff of modelling the bracket as coordinates rather than as a
 * linked tree: rendering it is a group-by, and a half-finished bracket is not a
 * special case.
 *
 * NOTE ON STYLING: plain boxes in scrollable columns — no connector lines, no
 * curves. Those are a visual-pass job (docs/03-uiux-design-brief.md wants a
 * horizontally scrollable bracket tree); the data and layout are already in the
 * right shape for it.
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
    // overflow-x-auto on the wrapper, not the page: a wide bracket scrolls
    // inside its own box while the page itself never scrolls sideways.
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-4">
        {/* Array.from({length: rounds}) → [1, 2, 3]. Rounds are 1-indexed to
            match the data, so +1 rather than the usual 0-based index. */}
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
