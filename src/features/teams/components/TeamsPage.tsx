import { useDeferredValue, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Card } from '../../../shared/components/Card'
import { Button } from '../../../shared/components/Button'
import { Skeleton } from '../../../shared/components/Skeleton'
import { EmptyState } from '../../../shared/components/EmptyState'
import { useAuthStore } from '../../auth/authStore'
import { useTeams } from '../api/useTeams'
import { useMyInvites } from '../api/useInvites'
import { TeamCard } from './TeamCard'
import { isCaptain } from '../types'

function TeamCardSkeleton() {
  return (
    <Card>
      <div className="flex gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="mt-2 h-4 w-1/3" />
        </div>
      </div>
    </Card>
  )
}

/**
 * /teams — browse every team.
 *
 * Search lives in the URL so /teams?q=kochi is shareable and the back button
 * steps through searches. The input itself stays local and syncs through
 * useDeferredValue, so typing does not push one history entry per letter.
 *
 * The four list states are rendered inline rather than extracted the way
 * MatchList was: MatchList earned extraction because a second screen needs it,
 * and nothing else renders a team list yet.
 */
export function TeamsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUserId = useAuthStore((state) => state.user?.id)

  const q = searchParams.get('q') ?? undefined
  const [searchValue, setSearchValue] = useState(q ?? '')
  const deferredSearch = useDeferredValue(searchValue)

  useEffect(() => {
    const trimmed = deferredSearch.trim()
    const current = searchParams.get('q') ?? ''

    // Without this guard the write re-renders, which re-runs the effect.
    if (trimmed === current) return

    const next = new URLSearchParams(searchParams)
    if (trimmed) {
      next.set('q', trimmed)
    } else {
      next.delete('q')
    }

    setSearchParams(next, { replace: true })
  }, [deferredSearch, searchParams, setSearchParams])

  const { data: teams, isPending, isError, isFetching, refetch } = useTeams({ q })

  // Same hook and key as the inbox page, so this reads that cache rather than
  // fetching again, and both update together when a mutation invalidates it.
  // Derived rather than mirrored into Zustand — see docs/02 flow 8.
  const { data: invites } = useMyInvites()
  const pendingInvites = invites?.length ?? 0

  return (
    <div className="flex flex-col gap-5 p-4 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-display text-content">Teams</h1>
          <p className="text-meta text-content-muted">Find a squad, or start your own</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* Hidden at zero rather than showing "Invites 0". */}
          {pendingInvites > 0 && (
            <Link
              to="/invites"
              className="relative rounded-control bg-raised px-3 py-2 text-meta font-medium text-content"
            >
              Invites
              <span className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-label text-primary">
                {pendingInvites}
              </span>
            </Link>
          )}

          <Link
            to="/teams/new"
            className="inline-flex min-h-11 items-center rounded-control bg-primary px-4 text-meta font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            + Create
          </Link>
        </div>
      </div>

      <input
        type="search"
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        placeholder="Search teams or locations"
        aria-label="Search teams"
        className="rounded-control border border-border-strong px-3 py-2 text-meta outline-none focus:ring-2 focus:ring-primary/40"
      />

      {isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <TeamCardSkeleton key={i} />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          title="Couldn't load teams"
          description="Something went wrong on our end."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          }
        />
      )}

      {/* Deliberately different words from the error above. */}
      {!isPending && !isError && teams?.length === 0 && (
        <EmptyState
          title="No teams found"
          description={q ? `Nothing matches "${q}".` : 'Be the first to start one.'}
          action={
            q ? (
              <Button variant="secondary" onClick={() => setSearchValue('')}>
                Clear search
              </Button>
            ) : undefined
          }
        />
      )}

      {!isPending && !isError && teams && teams.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 transition-opacity ${
            isFetching ? 'opacity-60' : 'opacity-100'
          }`}
        >
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              // Derived — no "myTeams" query, no stored flag.
              isYourTeam={isCaptain(team, currentUserId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
