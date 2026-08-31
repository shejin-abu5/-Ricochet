import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  createTournament,
  drawBracket,
  enterTeam,
  fetchTournament,
  fetchTournaments,
  recordResult,
} from './tournamentsApi'
import { useUiStore } from '../../../shared/uiStore'
import type { CreateTournamentFormValues } from '../schemas'
import type { Tournament } from '../types'

/**
 * A fifth key tree, same shape as the other four.
 */
export const tournamentKeys = {
  all: ['tournaments'] as const,
  list: () => ['tournaments', 'list'] as const,
  detail: (id: string) => ['tournaments', 'detail', id] as const,
}

export function useTournaments() {
  return useQuery({
    queryKey: tournamentKeys.list(),
    queryFn: fetchTournaments,
  })
}

export function useTournament(id: string) {
  return useQuery({
    queryKey: tournamentKeys.detail(id),
    queryFn: () => fetchTournament(id),
    retry: (failureCount, error) => {
      if (error.message.includes('does not exist')) return false
      return failureCount < 2
    },
  })
}

export function useCreateTournament() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: (data: CreateTournamentFormValues) => createTournament(data),

    onSuccess: (tournament) => {
      queryClient.invalidateQueries({ queryKey: tournamentKeys.all })
      showToast('Tournament created')
      // Straight to the new tournament — it's empty and needs teams, so the
      // detail page is where you actually want to be. Same call as
      // useCreateTeam.
      navigate(`/tournaments/${tournament.id}`)
    },

    onError: (error) => showToast(error.message, 'error'),
  })
}

/**
 * ============================================================
 *  THREE MUTATIONS, ONE SHARED SHAPE
 * ============================================================
 *
 * Entering a team, drawing the bracket and recording a result all:
 *
 *   - act on one tournament
 *   - get the FULL updated tournament back
 *   - want that written into the detail cache, and the list refreshed
 *
 * So they share this one factory instead of three near-identical hooks. Worth
 * extracting only because the success handling is genuinely identical — if
 * they diverged (say, one needed to invalidate teams too), splitting them back
 * apart would be the right move rather than adding flags to this.
 *
 * ---- setQueryData BEFORE invalidate ----
 *
 * `setQueryData` writes the server's response straight into the cache, so the
 * new bracket appears immediately. `invalidateQueries` then refreshes the list
 * in the background. Without the first line, the screen would sit on stale data
 * for a whole extra round trip while the refetch ran.
 *
 * This is NOT an optimistic update — it's the server's real answer, after it
 * arrived. Nothing is guessed, so there's nothing to roll back. Worth keeping
 * the two ideas separate: `setQueryData` is a tool, optimism is a strategy that
 * happens to use it.
 *
 * ---- WHY NONE OF THESE ARE OPTIMISTIC ----
 *
 * Drawing a bracket produces a RANDOM pairing — the client cannot predict it,
 * by definition. Recording a result cascades into the next round and possibly
 * crowns a champion. Both are rare, deliberate, organiser-only actions where a
 * short wait is fine. Optimism is for frequent, predictable interactions.
 */
function useTournamentMutation<TArgs>({
  tournamentId,
  request,
  successMessage,
}: {
  tournamentId: string
  request: (args: TArgs) => Promise<Tournament>
  successMessage: (tournament: Tournament) => string
}) {
  const queryClient = useQueryClient()
  const showToast = useUiStore((state) => state.showToast)

  return useMutation({
    mutationFn: request,

    onSuccess: (tournament) => {
      queryClient.setQueryData(tournamentKeys.detail(tournamentId), tournament)
      queryClient.invalidateQueries({ queryKey: tournamentKeys.list() })
      showToast(successMessage(tournament))
    },

    onError: (error) => showToast(error.message, 'error'),
  })
}

export function useEnterTeam(tournamentId: string) {
  return useTournamentMutation<string>({
    tournamentId,
    request: (teamId) => enterTeam(tournamentId, teamId),
    successMessage: (tournament) =>
      // The count comes from the SERVER's response, not from a number the
      // client incremented — so it's right even if someone else entered a team
      // a second ago.
      `Entered — ${tournament.teamCount}/${tournament.slots} teams in`,
  })
}

export function useDrawBracket(tournamentId: string) {
  return useTournamentMutation<void>({
    tournamentId,
    request: () => drawBracket(tournamentId),
    successMessage: () => 'Bracket drawn',
  })
}

export function useRecordResult(tournamentId: string) {
  return useTournamentMutation<{ matchId: string; scoreA: number; scoreB: number }>({
    tournamentId,
    request: ({ matchId, scoreA, scoreB }) =>
      recordResult(tournamentId, matchId, scoreA, scoreB),
    successMessage: (tournament) =>
      // The server tells us whether that was the final, so the toast can say
      // the interesting thing rather than a generic "saved".
      tournament.status === 'completed'
        ? `${tournament.championTeamName} win the tournament`
        : 'Result recorded',
  })
}
