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
 * ---- WHY PLAIN useState AND NOT REACT HOOK FORM ----
 *
 * Every other form in this project uses RHF + Zod, and consistency usually
 * wins. This one is two number inputs with one rule ("not a draw"), rendered
 * inline inside a bracket rather than on its own page.
 *
 * RHF earns its keep on forms with many fields, where avoiding a re-render per
 * keystroke matters and where validation rules pile up. Here it would be more
 * setup than logic.
 *
 * The honest version of the guideline: match the codebase's patterns unless you
 * can say WHY this case is different. Two controlled number inputs is a
 * difference worth naming — and if this form grows a date, a venue and a notes
 * field, it should move to RHF like the others.
 *
 * NOTE: the real validation is server-side anyway (no draws, whole numbers,
 * both teams decided, not already recorded). What's here is fast feedback.
 */
export function RecordResultForm({ tournamentId, match, onDone }: RecordResultFormProps) {
  // Strings, not numbers. An empty number input gives '' — and forcing that to
  // a number early means either NaN or a 0 the user didn't type, which then
  // fights them as they edit. Keep it a string, convert at the boundary.
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')

  const recordResult = useRecordResult(tournamentId)

  const a = Number(scoreA)
  const b = Number(scoreB)
  const bothFilled = scoreA !== '' && scoreB !== ''
  const isDraw = bothFilled && a === b

  const handleSubmit = (event: React.FormEvent) => {
    // Without this the browser does a full page navigation on submit and the
    // whole app reloads — the single most common React form bug.
    event.preventDefault()
    if (!bothFilled || isDraw) return

    recordResult.mutate(
      { matchId: match.id, scoreA: a, scoreB: b },
      // Close the form only once the server has accepted it. Closing on click
      // would hide the error message if it failed.
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

      {/* Told BEFORE they submit, not after a round trip. The server enforces
          the same rule — this is the fast half of the same answer. */}
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
