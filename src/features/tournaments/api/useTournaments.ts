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
      // Straight to the new tournament: it is empty and needs teams.
      navigate(`/tournaments/${tournament.id}`)
    },

    onError: (error) => showToast(error.message, 'error'),
  })
}

/**
 * Shared factory for entering a team, drawing the bracket and recording a
 * result: all three act on one tournament, get the full updated tournament
 * back, and want it written to the detail cache with the list refreshed.
 *
 * If one ever diverges, split it back out rather than adding flags here.
 *
 * setQueryData before invalidate so the new bracket appears immediately rather
 * than after a round trip. Not an optimistic update — this is the server's real
 * answer, so there is nothing to roll back.
 *
 * None of the three are optimistic: a draw is random and unpredictable by
 * definition, a result cascades into the next round, and both are rare
 * organiser-only actions where a short wait is fine.
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
      // Count from the server's response, so it stays right if someone else
      // entered a team a second ago.
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
      tournament.status === 'completed'
        ? `${tournament.championTeamName} win the tournament`
        : 'Result recorded',
  })
}
