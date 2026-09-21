import { authHeaders } from '../../../shared/api/authHeaders'
import type { Tournament } from '../types'
import type { CreateTournamentFormValues } from '../schemas'

/**
 * All four mutations resolve to the FULL updated tournament rather than an ack.
 *
 * Each one ripples: drawing a bracket changes status and creates matches, and a
 * result updates one match, feeds the next round, and may crown a champion.
 * Returning the whole object means the client drops it into the cache instead of
 * re-implementing the bracket rules or refetching anyway.
 */

export async function fetchTournaments(): Promise<Tournament[]> {
  const response = await fetch('/api/tournaments', { headers: authHeaders() })

  if (!response.ok) {
    throw new Error('Could not load tournaments. Please try again.')
  }

  return response.json()
}

export async function fetchTournament(id: string): Promise<Tournament> {
  const response = await fetch(`/api/tournaments/${id}`, { headers: authHeaders() })

  if (response.status === 404) {
    throw new Error('That tournament does not exist.')
  }

  if (!response.ok) {
    throw new Error('Could not load this tournament. Please try again.')
  }

  return response.json()
}

/** Shared error handling for the four calls below. */
async function postJson(url: string, body?: unknown): Promise<Tournament> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body ?? {}),
  })

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    // The server's message is the useful one: "needs all 8 teams — 5 entered so
    // far", "a knockout match needs a winner — no draws".
    throw new Error(errorBody?.message ?? 'Something went wrong. Please try again.')
  }

  return response.json()
}

export function createTournament(data: CreateTournamentFormValues): Promise<Tournament> {
  return postJson('/api/tournaments', data)
}

export function enterTeam(tournamentId: string, teamId: string): Promise<Tournament> {
  return postJson(`/api/tournaments/${tournamentId}/teams`, { teamId })
}

export function drawBracket(tournamentId: string): Promise<Tournament> {
  return postJson(`/api/tournaments/${tournamentId}/draw`)
}

export function recordResult(
  tournamentId: string,
  matchId: string,
  scoreA: number,
  scoreB: number
): Promise<Tournament> {
  return postJson(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
    scoreA,
    scoreB,
  })
}
