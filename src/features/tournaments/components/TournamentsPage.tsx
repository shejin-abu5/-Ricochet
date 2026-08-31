import { Link } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useTournaments } from '../api/useTournaments'
import { playPeriodLabels, type Tournament, type TournamentStatus } from '../types'

/**
 * "5 Sep 2026" for a one-day cup, "5 – 7 Sep 2026" for a longer one.
 *
 * Duplicated in TournamentDetailPage with slightly different wording (that one
 * spells out the weekday). Left as two small functions rather than one shared
 * helper with a `format` flag — two callers with genuinely different output is
 * not duplication worth removing, and a helper with a mode switch is usually
 * harder to read than both versions of it.
 *
 * (If a third caller appears, that's the moment to reconsider — same
 * "second consumer" rule used everywhere else in this project.)
 */
function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)

  const endLabel = end.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  if (start.toDateString() === end.toDateString()) return endLabel

  const startLabel = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return `${startLabel} – ${endLabel}`
}

/**
 * Status → words and colour, in one lookup.
 *
 * A Record keyed by the union type means adding a status to TournamentStatus
 * without adding it here is a COMPILE ERROR, not a blank badge discovered in
 * production. Same trick as variantClasses in Badge.tsx.
 */
const statusMeta: Record<TournamentStatus, { label: string; variant: 'success' | 'warning' | 'neutral' }> = {
  open: { label: 'Taking entries', variant: 'success' },
  in_progress: { label: 'In progress', variant: 'warning' },
  completed: { label: 'Finished', variant: 'neutral' },
}

function TournamentCard({ tournament }: { tournament: Tournament }) {
  const status = statusMeta[tournament.status]

  return (
    <Link to={`/tournaments/${tournament.id}`} className="block">
      <Card interactive className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-medium text-content">{tournament.name}</h3>
            <p className="truncate text-meta text-content-muted">{tournament.location}</p>
          </div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-meta text-content-muted">
          <Badge>Knockout</Badge>
          {/* Day/night on the CARD, not just the detail page — whether a
              tournament is played at 8am or under floodlights is one of the
              first things that rules it in or out, so it belongs where people
              are scanning a list. */}
          <Badge>{playPeriodLabels[tournament.playPeriod]}</Badge>
          <span>{formatDateRange(tournament.startDate, tournament.endDate)}</span>
          <span>{tournament.startTime}</span>
          <span>
            {tournament.teamCount}/{tournament.slots} teams
          </span>
        </div>

        {/* Only finished tournaments have a champion, so this line only exists
            when there's something to say. */}
        {tournament.championTeamName && (
          <p className="mt-2 text-meta text-content">
            Winner: {tournament.championTeamName}
          </p>
        )}
      </Card>
    </Link>
  )
}

/**
 * /tournaments — the list.
 *
 * The same four states as every read screen in this app: loading, error,
 * empty, success. Fifth time now.
 *
 * No filters or search yet, deliberately — there is one seeded handful of
 * tournaments and adding a filter UI before there's anything to filter is
 * building for an imagined problem. The pattern is in DiscoverPage and
 * TeamsPage when it's needed.
 */
export function TournamentsPage() {
  const { data: tournaments, isPending, isError, refetch } = useTournaments()

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-content">Tournaments</h1>
          <p className="text-meta text-content-muted">Knockout cups near you</p>
        </div>

        <Link
          to="/tournaments/new"
          className="inline-flex min-h-11 shrink-0 items-center rounded-control bg-primary px-4 text-meta font-medium text-on-primary transition-colors hover:bg-primary-hover"
        >
          + Create
        </Link>
      </div>

      {isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-2 h-4 w-1/2" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title="Couldn't load tournaments"
          description="Something went wrong on our end."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {!isPending && !isError && tournaments?.length === 0 && (
        <EmptyState
          title="No tournaments yet"
          description="Be the first to organise one."
          action={
            <Link to="/tournaments/new">
              <Button variant="secondary">Create a tournament</Button>
            </Link>
          }
        />
      )}

      {!isPending && !isError && tournaments && tournaments.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>
      )}
    </div>
  )
}
