import { useState } from 'react'
import { Button } from '../../../shared/components/Button'
import { useRecordResult } from '../api/useTournaments'
import type { TournamentMatch } from '../types'

interface RecordResultFormProps {
  tournamentId: string
  match: TournamentMatch
  onDone: () => void
}

/**
 * Enter a score for one match.
 *
 * Plain useState rather than the RHF + Zod every other form here uses: two
 * number inputs and one rule, rendered inline in a bracket, where RHF would be
 * more setup than logic. If this grows a date, venue and notes, move it across.
 *
 * The real validation is server-side (no draws, whole numbers, both teams
 * decided, not already recorded) — this is the fast half of the same answer.
 */
export function RecordResultForm({ tournamentId, match, onDone }: RecordResultFormProps) {
  // Strings, not numbers: an empty number input gives '', and coercing early
  // yields either NaN or a 0 the user did not type and then has to delete.
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')

  const recordResult = useRecordResult(tournamentId)

  const a = Number(scoreA)
  const b = Number(scoreB)
  const bothFilled = scoreA !== '' && scoreB !== ''
  const isDraw = bothFilled && a === b

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!bothFilled || isDraw) return

    recordResult.mutate(
      { matchId: match.id, scoreA: a, scoreB: b },
      // Close only once the server accepts, or a failure hides its own error.
      { onSuccess: onDone }
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1 truncate text-meta text-content">
          {match.teamAName}
        </label>
        <input
          type="number"
          min={0}
          value={scoreA}
          onChange={(event) => setScoreA(event.target.value)}
          aria-label={`Score for ${match.teamAName}`}
          className="w-16 rounded-control border border-border-strong px-2 py-1 text-meta"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1 truncate text-meta text-content">
          {match.teamBName}
        </label>
        <input
          type="number"
          min={0}
          value={scoreB}
          onChange={(event) => setScoreB(event.target.value)}
          aria-label={`Score for ${match.teamBName}`}
          className="w-16 rounded-control border border-border-strong px-2 py-1 text-meta"
        />
      </div>

      {isDraw && (
        <p role="alert" className="text-meta text-danger">
          A knockout match needs a winner — no draws.
        </p>
      )}

      {recordResult.error && (
        <p role="alert" className="text-meta text-danger">
          {recordResult.error.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          type="submit"
          className="flex-1"
          disabled={!bothFilled || isDraw}
          isLoading={recordResult.isPending}
        >
          Save result
        </Button>
        <Button type="button" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
