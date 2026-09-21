import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Badge } from '../../../shared/components/Badge'
import { Button } from '../../../shared/components/Button'
import { Avatar } from '../../../shared/components/Avatar'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useAuthStore } from '../../auth/authStore'
import { useDrawBracket, useEnterTeam, useTournament } from '../api/useTournaments'
import { BracketView } from './BracketView'
import { RecordResultForm } from './RecordResultForm'
import { playPeriodLabels, type TournamentMatch } from '../types'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * "Saturday 5 September" for a one-day cup, "5 – 7 Sep 2026" otherwise.
 *
 * Compares the date part only: two ISO strings for the same day can differ in
 * their time component, and "5 September – 5 September" reads as a bug.
 */
function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end = new Date(endIso)

  if (start.toDateString() === end.toDateString()) {
    return formatDate(startIso)
  }

  const startShort = start.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  const endLong = end.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${startShort} – ${endLong}`
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <Skeleton className="h-6 w-2/3" />
      <Card>
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-3 h-4 w-1/3" />
      </Card>
    </div>
  )
}

/**
 * /tournaments/:id — the whole lifecycle on one page, since which controls
 * appear is a function of `status` and who you are:
 *
 *   open        entered teams and open slots; a captain of an un-entered team
 *               gets "Enter <team>", and the organiser gets "Draw the bracket"
 *               once the field is full
 *   in_progress the bracket, with "Record result" for the organiser
 *   completed   the bracket plus the champion
 *
 * All derived from the tournament object and the current user — there is no
 * local copy of "has the bracket been drawn".
 */
export function TournamentDetailPage() {
  const { id = '' } = useParams()
  const { data: tournament, isPending, isError, error, refetch } = useTournament(id)
  const currentUserId = useAuthStore((state) => state.user?.id)

  // Which match is having its result entered — ephemeral, and nothing outside
  // this component needs it.
  const [resultMatch, setResultMatch] = useState<TournamentMatch | null>(null)

  const enterTeam = useEnterTeam(id)
  const drawBracket = useDrawBracket(id)

  if (isPending) return <DetailSkeleton />

  if (isError) {
    const notFound = error.message.includes('does not exist')

    return (
      <div className="p-4 lg:p-6">
        <EmptyState
          title={notFound ? 'Tournament not found' : "Couldn't load this tournament"}
          description={
            notFound ? 'It may have been cancelled.' : 'Something went wrong on our end.'
          }
          action={
            notFound ? (
              <Link to="/tournaments">
                <Button variant="secondary">All tournaments</Button>
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => refetch()}>
                Try again
              </Button>
            )
          }
        />
      </div>
    )
  }

  const isOrganiser = !!currentUserId && tournament.organiserId === currentUserId
  const openSlots = tournament.slots - tournament.teamCount
  const isFull = openSlots <= 0
  // Server-computed and detail-only, so undefined means "not answered here",
  // never "none".
  const enterableTeams = tournament.enterableTeams ?? []

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div>
        <Link to="/tournaments" className="text-meta text-content-muted hover:text-content">
          &larr; All tournaments
        </Link>
        <h1 className="mt-2 text-display text-content">{tournament.name}</h1>
        <p className="text-meta text-content-muted">{tournament.location}</p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Knockout</Badge>
          <Badge variant={isFull ? 'warning' : 'success'}>
            {tournament.teamCount}/{tournament.slots} teams
          </Badge>
          {tournament.status === 'completed' && <Badge>Finished</Badge>}
        </div>

        <dl className="mt-3 flex flex-col gap-1 text-meta">
          <div className="flex gap-2">
            <dt className="text-content-muted">Dates</dt>
            <dd className="text-content">
              <time dateTime={tournament.startDate}>
                {formatDateRange(tournament.startDate, tournament.endDate)}
              </time>
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-content-muted">Kickoff</dt>
            {/* Printed exactly as stored — no new Date(). It is a wall-clock
                time, so converting would show a different number to a viewer in
                another timezone. */}
            <dd className="text-content">
              {tournament.startTime} · {playPeriodLabels[tournament.playPeriod]}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-content-muted">Organiser</dt>
            <dd className="text-content">
              {tournament.organiserName}
              {isOrganiser && ' (you)'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* The server omits these for logged-out viewers, so there is nothing in
          the response to un-hide in devtools. This check reads what the server
          chose to send; it does not enforce the rule. */}
      {tournament.contactPhone && (
        <Card>
          <h2 className="text-meta font-medium text-content">Contact the organiser</h2>
          <dl className="mt-3 flex flex-col gap-1 text-meta">
            <div className="flex gap-2">
              <dt className="text-content-muted">Phone</dt>
              <dd>
                <a href={`tel:${tournament.contactPhone}`} className="text-primary">
                  {tournament.contactPhone}
                </a>
              </dd>
            </div>
            {tournament.contactEmail && (
              <div className="flex gap-2">
                <dt className="text-content-muted">Email</dt>
                <dd>
                  <a href={`mailto:${tournament.contactEmail}`} className="text-primary">
                    {tournament.contactEmail}
                  </a>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      )}

      {tournament.championTeamName && (
        <Card>
          <h2 className="text-meta font-medium text-content">Champion</h2>
          <p className="mt-2 text-content">{tournament.championTeamName}</p>
        </Card>
      )}

      <Card>
        <h2 className="text-meta font-medium text-content">
          Teams{' '}
          <span className="font-normal text-content-muted">
            {tournament.teamCount} / {tournament.slots}
          </span>
        </h2>

        <ul className="mt-3 flex flex-col gap-2">
          {tournament.teams.map((team) => (
            <li key={team.teamId} className="flex items-center gap-3">
              <Avatar name={team.teamName} colour={team.teamColour} />
              <Link
                to={`/teams/${team.teamId}`}
                className="truncate text-meta text-content hover:text-primary"
              >
                {team.teamName}
              </Link>
            </li>
          ))}

          {/* Dashed rows for open slots, matching match and team rosters so
              "how full is this" reads the same way everywhere. */}
          {tournament.status === 'open' &&
            Array.from({ length: Math.max(0, openSlots) }).map((_, i) => (
              <li key={`open-${i}`} className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-8 w-8 shrink-0 rounded-full border border-dashed border-border-strong"
                />
                <span className="text-meta text-content-faint">Open slot</span>
              </li>
            ))}
        </ul>

        {/* Shown only when there is something to click. The server re-checks
            captaincy regardless. */}
        {tournament.status === 'open' && enterableTeams.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <h3 className="text-meta font-medium text-content">Enter your team</h3>
            <div className="mt-2 flex flex-col gap-2">
              {enterableTeams.map((team) => (
                <Button
                  key={team.teamId}
                  variant="secondary"
                  isLoading={
                    // One mutation serves every button here, so isPending alone
                    // would spin all of them.
                    enterTeam.isPending && enterTeam.variables === team.teamId
                  }
                  disabled={isFull}
                  onClick={() => enterTeam.mutate(team.teamId)}
                >
                  Enter {team.teamName}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {isOrganiser && tournament.status === 'open' && (
        <Card>
          <h2 className="text-meta font-medium text-content">Draw the bracket</h2>
          <p className="mt-1 text-meta text-content-muted">
            {isFull
              ? 'Pairs the teams at random and starts the tournament. This cannot be undone.'
              : `Waiting for ${openSlots} more ${openSlots === 1 ? 'team' : 'teams'}.`}
          </p>
          <Button
            className="mt-3"
            disabled={!isFull}
            isLoading={drawBracket.isPending}
            onClick={() => drawBracket.mutate()}
          >
            Draw bracket
          </Button>
        </Card>
      )}

      {tournament.status !== 'open' && (
        <Card>
          <h2 className="text-meta font-medium text-content">Bracket</h2>
          <div className="mt-3">
            <BracketView
              tournament={tournament}
              isOrganiser={isOrganiser}
              onRecordResult={setResultMatch}
            />
          </div>
        </Card>
      )}

      {/* Inline below the bracket rather than in shared/components/Modal: an
          inline panel needs no focus trapping to be usable, and moving it into
          the Modal later requires no change to RecordResultForm. */}
      {resultMatch && (
        <Card>
          <h2 className="text-meta font-medium text-content">Record result</h2>
          <div className="mt-3">
            <RecordResultForm
              tournamentId={id}
              // Remounts the form when you switch matches, clearing the score
              // inputs — without it the previous match's scores stay in them.
              key={resultMatch.id}
              match={resultMatch}
              onDone={() => setResultMatch(null)}
            />
          </div>
        </Card>
      )}
    </div>
  )
}
