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
 * Search lives in the URL, exactly as on DiscoverPage: /teams?q=kochi is a
 * shareable link, the back button steps through searches, and a refresh keeps
 * them. The input itself stays in local state and syncs to the URL through
 * useDeferredValue, so typing doesn't push one history entry per letter.
 *
 * ---- A JUDGEMENT CALL WORTH EXPLAINING ----
 *
 * DiscoverPage hands its four list states (loading / error / empty / success)
 * to a separate MatchList component. This page renders them inline instead.
 *
 * Not an inconsistency — MatchList was extracted because a SECOND screen needs
 * it (a team's upcoming matches, Phase 3c). Nothing else renders a team list
 * yet, so extracting now would be inventing a reusable component with one
 * caller and guessing at its props.
 *
 * Same rule that moved `initials()` into Avatar.tsx this phase: extract on the
 * second use, not the first. Guessing early usually produces the wrong seams.
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

    // Guard against the effect re-triggering itself forever.
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

  /**
   * ---- THE BADGE COUNT IS DERIVED, NOT STORED ----
   *
   * The tempting design is a `pendingInviteCount` in a Zustand store so the
   * badge can read it "cheaply". Don't. That's a hand-maintained copy of
   * server data, and it goes wrong the moment an invite is answered anywhere
   * else — another tab, another device, or the inbox page in this same app.
   *
   * Instead the badge calls the SAME hook the inbox page calls. Identical
   * query key, so this does not fetch twice — it reads the cache the other
   * one filled, and both update together when the mutation invalidates it.
   *
   * That's the point docs/02-app-flow.md flow 8 makes about notification
   * counts: derive from the query, never duplicate into client state.
   */
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
          {/* Hidden entirely at zero rather than showing "Invites 0" — an
              empty inbox isn't something to advertise. */}
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

      {/* 1. LOADING */}
      {isPending && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <TeamCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 2. ERROR — recoverable, never a dead end. */}
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

      {/* 3. EMPTY — different words from the error above, on purpose. */}
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

      {/* 4. SUCCESS */}
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
              // Derived on the fly from data we already have. No "myTeams"
              // query, no flag stored anywhere — see the note on captainId in
              // features/teams/types.ts.
              isYourTeam={isCaptain(team, currentUserId)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
