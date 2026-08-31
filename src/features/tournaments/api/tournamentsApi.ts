import { authHeaders } from '../../../shared/api/authHeaders'
import type { Tournament } from '../types'
import type { CreateTournamentFormValues } from '../schemas'

/**
 * Raw fetch calls for tournaments. Knows HTTP, knows nothing about React —
 * the same split as every other api/ file here.
 *
 * Notice all four mutations return the FULL updated tournament. Entering a
 * team, drawing the bracket and recording a result each change the tournament
 * in ways that ripple (a drawn bracket changes status AND creates matches; a
 * result changes one match AND feeds the next round AND can crown a champion).
 *
 * Returning the whole thing means the client never has to work out the knock-on
 * effects — it drops the server's version into the cache and everything on
 * screen is correct at once. Returning `{ ok: true }` would force the client to
 * either refetch anyway or re-implement the bracket rules.
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
    // The server's message is always the useful one here: "Needs all 8 teams —
    // 5 entered so far", "A knockout match needs a winner — no draws".
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
